import crypto from 'crypto';

export const generateOTPCode = () => {
    return crypto.randomInt(100000, 999999).toString();
}