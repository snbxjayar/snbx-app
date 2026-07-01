import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="sms-center" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="signup" />
<Stack.Screen name="pending" />
<Stack.Screen name="admin" />
<Stack.Screen name="gateway-setup" />
    </Stack>
  );
}