import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getMobileEnv } from "./src/config/env";

type Health = { status: string; service: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = getMobileEnv().mailtrackerApiBaseUrl.replace(/\/$/, "");
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${base}/health`, { signal: ac.signal });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        setHealth((await res.json()) as Health);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Mail Tracker</Text>
      <Text style={styles.sub}>API: {getMobileEnv().mailtrackerApiBaseUrl}</Text>
      {!health && !error ? <ActivityIndicator color="#7CB9E8" /> : null}
      {health ? (
        <Text style={styles.ok}>
          {health.service}: {health.status}
        </Text>
      ) : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#E8EEF7", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sub: { color: "#9AA7B8", fontSize: 13, marginBottom: 16, textAlign: "center" },
  ok: { color: "#8FD694", fontSize: 15, marginTop: 8 },
  err: { color: "#F2A6A6", fontSize: 14, marginTop: 8, textAlign: "center" },
});
