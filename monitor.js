const pm2 = require("pm2");
const FormData = require("form-data"); // form-data v4.0.1
const Mailgun = require("mailgun.js"); // mailgun.js v11.1.0

async function handleEvent(eventName, packet) {
  try {
    console.log(
      `[Monitor] Event "${eventName}" for process:`,
      packet.process.name,
    );
    console.log("Details:", packet);

    // now we send the email
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
    });
    await mg.messages.create(
      "sandboxfd64b82f144c4fc79e8db1103ac09d3d.mailgun.org",
      {
        from: "Mailgun Sandbox <postmaster@sandboxfd64b82f144c4fc79e8db1103ac09d3d.mailgun.org>",
        to: ["Christopher Meyer <cameyer06@gmail.com>"],
        subject: "Hello Christopher Meyer",
        text: "Congratulations Christopher Meyer, you just sent an email with Mailgun! You are truly awesome!",
      },
    );
  } catch (err) {
    console.error("Error inside handler:", err);
  }
}

pm2.connect((err) => {
  if (err) {
    console.error("[Monitor] Failed to connect to PM2 daemon:", err);
    process.exit(1);
  }
  console.log("[Monitor] Connected to PM2 daemon");

  pm2.launchBus((err, bus) => {
    if (err) {
      console.error("[Monitor] Failed to launch event bus:", err);
      pm2.disconnect();
      process.exit(1);
    }
    console.log("[Monitor] PM2 event bus open");

    // subscribe to a variety of events
    const events = [
      "process:exception",
      "process:event", // includes restart, exit, stop, delete, etc
      "log:err",
      "log:out",
    ];
    for (const ev of events) {
      bus.on(ev, (packet) => {
        handleEvent(ev, packet);
      });
    }

    // Optionally respond to bus close / reconnect
    bus.on("close", () => {
      console.warn("[Monitor] PM2 bus connection closed");
    });
    bus.on("reconnect attempt", () => {
      console.log("[Monitor] Attempting bus reconnect");
    });
  });
});
