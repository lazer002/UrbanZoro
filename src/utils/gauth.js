import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.js'
import { signAccessToken, signRefreshToken } from '../utils/jwt.js' // your JWT utils

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
      refreshToken,
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

