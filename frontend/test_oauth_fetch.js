async function test() {
  const url = 'https://cxnbdkkjipniihkxggfk.supabase.co/auth/v1/authorize?provider=google';
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch(e) {
    console.error(e);
  }
}
test()
