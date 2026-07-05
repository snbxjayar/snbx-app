import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="rejected" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="sms-center" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="ghl-hub" />
      <Stack.Screen name="ghl-settings" />
      <Stack.Screen name="ghl-contacts" />
      <Stack.Screen name="gateway-setup" />
      <Stack.Screen name="welcome" />
    </Stack>
  );
}