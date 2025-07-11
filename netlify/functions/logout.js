exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': 'nikagenyx_session=deleted; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ok: true, message: "Logged out successfully" })
  };
};
