// plugins/withSmsGateway.js
// Place at: snbx-app/plugins/withSmsGateway.js
//
// This Expo config plugin injects our SMS Gateway service and receiver
// declarations into AndroidManifest.xml on EVERY prebuild automatically.
// This means they can NEVER be wiped by prebuild again.
//
// v2: Adds SmsFcmService (FCM wake-up) + Gradle deps (firebase-messaging, WorkManager)

const { withAndroidManifest, withAppBuildGradle } = require("@expo/config-plugins");

function addSmsGatewayToManifest(androidManifest) {
  const { manifest } = androidManifest;

  if (!manifest.application) {
    console.warn("withSmsGateway: No application found in manifest");
    return androidManifest;
  }

  const application = manifest.application[0];

  // ── Initialize arrays if they don't exist ────────────────────────────────
  if (!application.service) application.service = [];
  if (!application.receiver) application.receiver = [];

  // ── Check if already added (avoid duplicates on re-run) ──────────────────
  const serviceExists = application.service.some(
    (s) => s.$?.["android:name"] === ".sms.GatewayService"
  );
  const receiverExists = application.receiver.some(
    (r) => r.$?.["android:name"] === ".sms.SmsReceiver"
  );
  const fcmServiceExists = application.service.some(
    (s) => s.$?.["android:name"] === ".sms.SmsFcmService"
  );

  // ── Add GatewayService ────────────────────────────────────────────────────
  if (!serviceExists) {
    application.service.push({
      $: {
        "android:name": ".sms.GatewayService",
        "android:enabled": "true",
        "android:exported": "false",
        "android:foregroundServiceType": "dataSync",
      },
    });
    console.log("withSmsGateway: Added GatewayService to manifest");
  }

  // ── Add SmsFcmService (FCM wake-up channel) ───────────────────────────────
  if (!fcmServiceExists) {
    application.service.push({
      $: {
        "android:name": ".sms.SmsFcmService",
        "android:enabled": "true",
        "android:exported": "false",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } },
          ],
        },
      ],
    });
    console.log("withSmsGateway: Added SmsFcmService to manifest");
  }

  // ── Add SmsReceiver (incoming SMS) ────────────────────────────────────────
  if (!receiverExists) {
    application.receiver.push(
      {
        $: {
          "android:name": ".sms.SmsReceiver",
          "android:enabled": "true",
          "android:exported": "true",
          "android:permission": "android.permission.BROADCAST_SMS",
        },
        "intent-filter": [
          {
            $: { "android:priority": "999" },
            action: [{ $: { "android:name": "android.provider.Telephony.SMS_RECEIVED" } }],
          },
          {
            action: [{ $: { "android:name": "android.provider.Telephony.SMS_DELIVER" } }],
          },
        ],
      },
      // MMS receiver — required for default SMS app candidacy
      {
        $: {
          "android:name": ".sms.SmsReceiver",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.provider.Telephony.WAP_PUSH_DELIVER" } }],
            data: [{ $: { "android:mimeType": "application/vnd.wap.mms-message" } }],
          },
        ],
      }
    );
    console.log("withSmsGateway: Added SmsReceiver to manifest");
  }

  // ── Add RESPOND_VIA_MESSAGE intent filter to MainActivity ─────────────────
  const activity = manifest.application[0].activity?.find(
    (a) => a.$?.["android:name"] === ".MainActivity"
  );

  if (activity) {
    if (!activity["intent-filter"]) activity["intent-filter"] = [];

    const hasRespondViaMessage = activity["intent-filter"].some((f) =>
      f.action?.some(
        (a) => a.$?.["android:name"] === "android.intent.action.RESPOND_VIA_MESSAGE"
      )
    );

    if (!hasRespondViaMessage) {
      activity["intent-filter"].push({
        $: {},
        action: [{ $: { "android:name": "android.intent.action.RESPOND_VIA_MESSAGE" } }],
        category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
        data: [
          { $: { "android:scheme": "sms" } },
          { $: { "android:scheme": "smsto" } },
          { $: { "android:scheme": "mms" } },
          { $: { "android:scheme": "mmsto" } },
        ],
      });
      console.log("withSmsGateway: Added RESPOND_VIA_MESSAGE intent filter");
    }
  }

  return androidManifest;
}

// ── Inject Gradle dependencies (survive prebuild too) ───────────────────────
function addGradleDependencies(gradleContents) {
  const deps = [
    'implementation("com.google.firebase:firebase-messaging")',
    'implementation("androidx.work:work-runtime-ktx:2.9.0")',
  ];

  let updated = gradleContents;

  for (const dep of deps) {
    if (!updated.includes(dep)) {
      // Insert right after the dependencies { line
      updated = updated.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n    ${dep}`
      );
      console.log(`withSmsGateway: Added Gradle dep ${dep}`);
    }
  }

  return updated;
}

module.exports = function withSmsGateway(config) {
  config = withAndroidManifest(config, (config) => {
    config.modResults = addSmsGatewayToManifest(config.modResults);
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = addGradleDependencies(config.modResults.contents);
    return config;
  });

  return config;
};