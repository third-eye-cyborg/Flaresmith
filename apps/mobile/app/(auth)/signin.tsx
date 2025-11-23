/**
 * T020: Mobile sign-in screen
 * OAuth provider buttons (Apple, Google, GitHub) + Email/Password form
 * Uses expo-auth-session for OAuth flow with PKCE
 */

import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { getEnv } from "@flaresmith/utils";
import { useAuthContext } from "../../src/contexts/AuthProvider";

// Complete web browser auth sessions properly on iOS
WebBrowser.maybeCompleteAuthSession();

/**
 * Provider configuration for OAuth flows
 */
const PROVIDERS = {
  apple: {
    name: "Apple",
    icon: "🍎",
    color: "bg-black",
  },
  google: {
    name: "Google",
    icon: "🔍",
    color: "bg-blue-600",
  },
  github: {
    name: "GitHub",
    icon: "🐙",
    color: "bg-gray-800",
  },
} as const;

type Provider = keyof typeof PROVIDERS;

export default function SignInScreen() {
    const { login, register } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const apiBaseUrl = getEnv("EXPO_PUBLIC_API_URL") || "http://localhost:8787";

  /**
   * OAuth provider sign-in
  * Opens OAuth provider flow in browser with PKCE
   */
  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading(true);

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "flaresmith",
        path: "auth/callback",
      });

      // Generate PKCE code verifier (random string)
      const codeVerifier = Crypto.getRandomBytes(32).toString();
      
      // Generate code challenge (SHA256 hash of verifier, base64url encoded)
      const challengeBuffer = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      // Convert to base64url (replace +/= with -_)
      const codeChallenge = challengeBuffer
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      // Build OAuth URL with PKCE params
      const state = Math.random().toString(36).substring(7);
      const authUrl = `${apiBaseUrl}/api/auth/oauth/${provider}?` + 
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;

      // Open browser for OAuth flow
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === "success" && result.url) {
        // Parse callback URL for code and state
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        
        if (code && returnedState === state) {
          // Exchange code for tokens via API callback
          const response = await fetch(
            `${apiBaseUrl}/api/auth/oauth/callback?` +
            `provider=${provider}&` +
            `code=${encodeURIComponent(code)}&` +
            `state=${returnedState}&` +
            `code_verifier=${encodeURIComponent(codeVerifier)}`
          );

          if (response.ok) {
            const authData = await response.json();
            // TODO T022: Store tokens via useAuth hook
            console.log("Auth successful:", authData.user?.email);
            router.replace("/");
          } else {
            const error = await response.json();
            Alert.alert("Sign-in failed", error.error?.message || "Please try again");
          }
        } else {
          Alert.alert("Error", "Invalid OAuth response");
        }
      }
    } catch (error) {
      console.error(`OAuth sign-in error (${provider}):`, error);
      Alert.alert("Error", "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Email/Password authentication
   * Calls /api/auth/login or /api/auth/register
   */
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Email and password are required");
      return;
    }

    try {
      setIsLoading(true);
      
      if (mode === "signin") {
        await login({ email, password });
      } else {
        await register({ email, password });
      }
    } catch (error) {
      console.error(`Email auth error (${mode}):`, error);
      Alert.alert(
        mode === "signin" ? "Login Failed" : "Registration Failed",
        error instanceof Error ? error.message : "Please try again"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome to Flaresmith</Text>
        <Text className="text-base text-gray-600">
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </Text>
      </View>

      {/* OAuth Provider Buttons */}
      <View className="space-y-3 mb-6">
        {(Object.keys(PROVIDERS) as Provider[]).map((provider) => {
          const config = PROVIDERS[provider];
          return (
            <Pressable
              key={provider}
              onPress={() => handleOAuthSignIn(provider)}
              disabled={isLoading}
              className={`${config.color} py-4 px-6 rounded-lg flex-row items-center justify-center ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-2xl mr-3">{config.icon}</Text>
              <Text className="text-white font-semibold text-base">
                Continue with {config.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Divider */}
      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-4 text-gray-500">or</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {/* Email/Password Form */}
      <View className="space-y-4 mb-6">
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoading}
        />
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />
        <Pressable
          onPress={handleEmailAuth}
          disabled={isLoading}
          className={`bg-indigo-600 py-4 px-6 rounded-lg items-center ${
            isLoading ? "opacity-50" : ""
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Toggle Mode */}
      <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} disabled={isLoading}>
        <Text className="text-center text-gray-600">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <Text className="text-indigo-600 font-semibold">
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}
