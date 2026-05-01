import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.js'
import { signAccessToken, signRefreshToken } from '../utils/jwt.js' // your JWT utils
import axios from 'axios' // for mobile token exchange
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Missing Google token' });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ message: 'Invalid Google token' });

    const { email, name, picture, sub, email_verified } = payload;
    if (!email) return res.status(400).json({ message: 'Google token missing email' });

    let user = await User.findOne({ email });

    if (!user) {
      try {
        user = await User.create({
          name: name || '',
          email,
          googleId: sub,
          avatar: picture || '',
          provider: 'google',
          loginSource: 'web',
          role: 'user',
          isVerified: Boolean(email_verified),
          wishlist: [],
          cart: [],
          addresses: [],
          orders: [],
          lastLogin: new Date(),
        });
      } catch (createErr) {
        // rare race: another process created the user concurrently
        if (createErr && createErr.code === 11000) {
          user = await User.findOne({ email });
        } else {
          throw createErr;
        }
      }
    } else {
      // keep googleId if missing and update name/avatar if changed
      let changed = false;
      if (!user.googleId && sub) {
        user.googleId = sub;
        changed = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        changed = true;
      }
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        changed = true;
      }
      user.lastLogin = new Date();
      if (email_verified && !user.isVerified) {
        user.isVerified = true;
        changed = true;
      }
      if (changed) await user.save();
      else await user.updateOne({ lastLogin: user.lastLogin }); // cheap write for lastLogin
    }

    const jwtPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: false,        // true in production (HTTPS)
  sameSite: "lax",      // or "none" if cross-site + HTTPS
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        wishlist: user.wishlist,
        cart: user.cart,
        addresses: user.addresses,
        lastLogin: user.lastLogin,
      },
      accessToken,
    
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};





const mobile_client = new OAuth2Client(process.env.GOOGLE_CLIENT_APP);

export const googleLoginMobile = async (req, res) => {
  try {
    const { code,codeVerifier } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Missing authorization code",
      });
    }

    // 🔥 STEP 1: Exchange code → tokens
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_APP,
        redirect_uri: "com.anonymous.monkey:/oauthredirect",
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }
    );

    const { id_token } = tokenRes.data;

    if (!id_token) {
      return res.status(400).json({
        success: false,
        message: "Failed to retrieve id_token",
      });
    }

    // 🔥 STEP 2: Verify token
    const ticket = await mobile_client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_APP,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const { email, name, picture, sub, email_verified } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account missing email",
      });
    }

    // 🔥 STEP 3: Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || "",
        email,
        googleId: sub,
        provider: "google",
        avatar: picture || "",
        role: "user",
        loginSource: "android", // or "ios" based on your app
        isVerified: Boolean(email_verified),
        wishlist: [],
        cart: [],
        addresses: [],
        orders: [],
        lastLogin: new Date(),
      });
    } else {
      // 🔐 Security check
      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Account disabled",
        });
      }

      let updated = false;

      if (!user.googleId) {
        user.googleId = sub;
        updated = true;
      }

      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }

      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        updated = true;
      }

      if (email_verified && !user.isVerified) {
        user.isVerified = true;
        updated = true;
      }

      user.provider = "google";
      user.lastLogin = new Date();

      if (updated) await user.save();
      else await user.updateOne({ lastLogin: user.lastLogin });
    }

    // 🔥 STEP 4: Generate JWT
    const jwtPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // 🔥 STEP 5: Response
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        wishlist: user.wishlist,
        cart: user.cart,
        addresses: user.addresses,
        lastLogin: user.lastLogin,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(
      "Google Mobile Login Error:",
      err.response?.data || err.message
    );

    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
