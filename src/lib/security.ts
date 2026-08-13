import CryptoJS from 'crypto-js';
import { supabase } from './supabase';

// ক্লাউড থেকে পিন নিয়ে আসার ফাংশন
export const getCrossDevicePin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.vault_pin || null;
};

// নতুন পিন ক্লাউডে সেভ করার ফাংশন
export const setCrossDevicePin = async (pin: string) => {
  const { error } = await supabase.auth.updateUser({
    data: { vault_pin: pin }
  });
  if (error) throw error;
};

// AES-256 Encryption (ইউজারের নিজস্ব ID কে 'Secret Key' হিসেবে ব্যবহার করা হয়েছে)
const getSecretKey = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ? `os_secret_${user.id}` : 'fallback_os_secret_key_2026';
};

export const encryptData = async (text: string) => {
  if (!text) return text;
  const key = await getSecretKey();
  return CryptoJS.AES.encrypt(text, key).toString();
};

export const decryptData = async (cipherText: string) => {
  if (!cipherText) return cipherText;
  try {
    const key = await getSecretKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed", error);
    return "Error: Could not decrypt data";
  }
};