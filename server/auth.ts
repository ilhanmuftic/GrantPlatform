import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { validateEmailForApplicantType } from "./registration-utils";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password contains a salt (has a period)
  if (!stored || !stored.includes('.')) {
    // For backward compatibility (old passwords may not be hashed properly)
    // Handle this case by checking if passwords match directly (not recommended for security)
    console.warn("Password without proper hash format detected");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "grant-management-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Validate email format based on applicant type if role is applicant
      if (req.body.role === 'applicant' && req.body.applicantTypeId) {
        // Get the applicant type name
        const applicantType = await storage.getApplicantType(req.body.applicantTypeId);
        if (!applicantType) {
          console.error(`Invalid applicant type ID: ${req.body.applicantTypeId}`);
          return res.status(400).json({ message: "Invalid applicant type" });
        }
        
        console.log(`Processing registration for ${req.body.email} with applicant type: ${applicantType.name} (ID: ${applicantType.id})`);
        
        // Validate email for this applicant type
        const emailValidation = validateEmailForApplicantType(
          req.body.email, 
          applicantType.name
        );
        
        if (!emailValidation.valid) {
          console.log(`Registration rejected due to email validation: ${emailValidation.message}`);
          return res.status(400).json({ 
            message: emailValidation.message || "Email is not valid for this applicant type"
          });
        }
        
        console.log(`Email validation passed for ${req.body.email}`);
      }

      // For mockup - store in session and redirect to verification instead of creating user
      // In a real application, we would send a verification email with a code at this point
      
      // Store verification data in session if available
      if (req.session) {
        req.session.verificationData = {
          ...req.body,
          password: await hashPassword(req.body.password),
          pendingVerification: true
        };
        console.log("Stored verification data in session");
      }
      
      // Create a base64 encoded email for URL safety
      const encodedEmail = Buffer.from(req.body.email).toString('base64');
      
      // Return success with redirection information
      return res.status(200).json({
        success: true,
        message: "Verification code sent to email. Please check your inbox.",
        redirectUrl: `/verification/${encodedEmail}/${req.body.applicantTypeId}`
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
  
  // Test route for email validation without user creation
  app.post("/api/validate-email", async (req, res) => {
    try {
      const { email, applicantTypeId } = req.body;
      
      if (!email || !applicantTypeId) {
        return res.status(400).json({
          valid: false,
          message: "Both email and applicantTypeId are required"
        });
      }
      
      // Get applicant type
      const applicantType = await storage.getApplicantType(applicantTypeId);
      if (!applicantType) {
        return res.status(400).json({
          valid: false,
          message: "Invalid applicant type ID"
        });
      }
      
      console.log(`Testing validation for ${email} with applicant type: ${applicantType.name}`);
      
      // Validate email for this applicant type
      const result = validateEmailForApplicantType(email, applicantType.name);
      
      // Return validation result
      return res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      console.error("Email validation error:", error);
      return res.status(500).json({
        valid: false,
        message: "Error validating email"
      });
    }
  });
}
