import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User, IUser } from '../models/User.model';
import { env } from '../config/env';

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_ACCESS_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.userId);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.CLIENT_URL}/api/v1/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({
          provider: 'google',
          providerId: profile.id,
        });

        if (!user) {
          // Check by email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email: email.toLowerCase() });

            if (user) {
              // Update with Google provider info
              user.provider = 'google';
              user.providerId = profile.id;
              await user.save();
            } else {
              // Create new user
              user = new User({
                name: profile.displayName || 'User',
                email: email.toLowerCase(),
                provider: 'google',
                providerId: profile.id,
                avatar: profile.photos?.[0]?.value || null,
                isEmailVerified: true, // Google emails are verified
                password: undefined,
              });
              await user.save();
            }
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: `${env.CLIENT_URL}/api/v1/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({
          provider: 'github',
          providerId: profile.id,
        });

        if (!user) {
          // GitHub doesn't always provide email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email: email.toLowerCase() });

            if (user) {
              // Update with GitHub provider info
              user.provider = 'github';
              user.providerId = profile.id;
              await user.save();
            } else {
              // Create new user
              user = new User({
                name: profile.displayName || profile.username || 'User',
                email: email.toLowerCase(),
                provider: 'github',
                providerId: profile.id,
                avatar: profile.photos?.[0]?.value || null,
                isEmailVerified: true,
                password: undefined,
              });
              await user.save();
            }
          } else {
            // Use GitHub username as email placeholder (not ideal but works for auth)
            const fallbackEmail = `${profile.username}@github.placeholder`;
            user = new User({
              name: profile.displayName || profile.username || 'User',
              email: fallbackEmail,
              provider: 'github',
              providerId: profile.id,
              avatar: profile.photos?.[0]?.value || null,
              isEmailVerified: false,
              password: undefined,
            });
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;
