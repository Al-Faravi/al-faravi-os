import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");

    // 💡 মেইন ফিক্স: Database Error/RLS বাইপাস করার জন্য Admin Key (Service Role Key) ব্যবহার করা
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ১. ইউজার ভেরিফাই করা
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized: " + (userError?.message || "User not found"));
    }

    const email = user.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); 

    // ২. ডাটাবেসে সেভ করা (Admin Key থাকায় RLS আর ব্লক করবে না)
    const { error: dbError } = await supabaseAdmin
      .from("otp_verifications")
      .insert([{ user_id: user.id, otp_code: otp, expires_at: expiresAt }]);

    if (dbError) throw new Error("Database error: " + dbError.message);

    // ৩. ইমেইল পাঠানো
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Al_Faravi OS <onboarding@resend.dev>",
        to: email, // ⚠️ ওয়ার্নিং: আপনার Resend একাউন্টটি এই ইমেইল দিয়েই খোলা থাকতে হবে!
        subject: "Security Alert: OS PIN Reset OTP",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 10px;">
            <h2 style="color: #020F33;">Al_Faravi OS - Security</h2>
            <p style="color: #475569;">You have requested to change your System PIN. Your 6-digit verification code is:</p>
            <div style="background-color: #F8FAFC; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #02C2D5;">${otp}</span>
            </div>
            <p style="color: #ef4444; font-size: 12px;">* This code will expire in 5 minutes. Do not share this with anyone.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Resend Error: " + errorText);
    }

    return new Response(JSON.stringify({ message: "OTP sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});