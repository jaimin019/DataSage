async function test() {
  const url = 'https://cxnbdkkjipniihkxggfk.supabase.co/auth/v1/authorize?provider=google';
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log("Type:", res.type);
    console.log("Status:", res.status);
  } catch(e) {
    console.error("Fetch failed:", e);
  }
}
test()
