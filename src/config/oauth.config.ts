import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { config } from './index';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../models/user.model';

const userRepository = new UserRepository();

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userRepository.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: `${config.oauth_callback_base_url}/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find or create user
          let user = await userRepository.findByOAuthProvider('google', profile.id);
          
          if (!user) {
            // Create new user
            const newUser: Partial<User> = {
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName || '',
              oauthProvider: 'google',
              oauthId: profile.id,
              avatar: profile.photos?.[0]?.value || '',
              role: 'user',
            };
            user = await userRepository.create(newUser);
          } else {
            // Update last login
            user = await userRepository.updateLastLogin(user.id);
          }
          
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: `${config.oauth_callback_base_url}/github/callback`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Find or create user
          let user = await userRepository.findByOAuthProvider('github', profile.id);
          
          if (!user) {
            // Create new user
            const newUser: Partial<User> = {
              email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
              name: profile.displayName || profile.username || '',
              oauthProvider: 'github',
              oauthId: profile.id,
              avatar: profile.photos?.[0]?.value || '',
              role: 'user',
            };
            user = await userRepository.create(newUser);
          } else {
            // Update last login
            user = await userRepository.updateLastLogin(user.id);
          }
          
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;


