// src/app/ghl-contacts.tsx
// Place at: snbx-app/src/app/ghl-contacts.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  FlatList, TextInput, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  useGHLCredentials, getContacts, createContact,
  updateContact, addTagsToContact, GHLContact,
} from "../hooks/useGHL";

const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  gold:        "#C9A84C",
  navy:        "#0D1B2A",
  navyCard:    "#0F2030",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
  border:      "#1A3A2A",
  error:       "#E05A5A",
  inputBg:     "#0A1929",
};

function getInitials(contact: GHLContact): string {
  const first = contact.firstName?.[0] ?? "";
  const last  = contact.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || (contact.email?.[0] ?? "?").toUpperCase();
}

function getFullName(contact: GHLContact): string {
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : contact.email ?? "Unknown";
}

// ── Contact Form Modal ────────────────────────────────────────────────────────
function ContactFormModal({
  visible, contact, onClose, onSave, saving,
}: {
  visible: boolean;
  contact?: GHLContact;
  onClose: () => void;
  onSave: (data: Partial<GHLContact>) => void;
  saving: boolean;
}) {
  const [firstName, setFirstName] = useState(contact?.firstName ?? "");
  const [lastName, setLastName]   = useState(contact?.lastName ?? "");
  const [email, setEmail]         = useState(contact?.email ?? "");
  const [phone, setPhone]         = useState(contact?.phone ?? "");
  const [company, setCompany]     = useState(contact?.companyName ?? "");
  const [tagInput, setTagInput]   = useState("");
  const [tags, setTags]           = useState<string[]>(contact?.tags ?? []);

useEffect(() => {
  setFirstName(contact?.firstName ?? "");
  setLastName(contact?.lastName ?? "");
  setEmail(contact?.email ?? "");
  setPhone(contact?.phone ?? "");
  setCompany(contact?.companyName ?? "");
  setTags(contact?.tags ?? []);
}, [contact]);

  const isEdit = !!contact?.id;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = () => {
    if (!firstName.trim() && !email.trim()) {
      Alert.alert("Validation", "Please enter at least a first name or email.");
      return;
    }
    onSave({ firstName, lastName, email, phone, companyName: company, tags });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={fm.overlay}>
        <View style={fm.sheet}>
          <View style={fm.handle} />
          <Text style={fm.title}>{isEdit ? "Edit Contact" : "New Contact"}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={fm.label}>First Name</Text>
            <TextInput style={fm.input} placeholder="Juan" placeholderTextColor={C.muted}
              value={firstName} onChangeText={setFirstName} />

            <Text style={fm.label}>Last Name</Text>
            <TextInput style={fm.input} placeholder="dela Cruz" placeholderTextColor={C.muted}
              value={lastName} onChangeText={setLastName} />

            <Text style={fm.label}>Email</Text>
            <TextInput style={fm.input} placeholder="juan@email.com" placeholderTextColor={C.muted}
              keyboardType="email-address" autoCapitalize="none"
              value={email} onChangeText={setEmail} />

            <Text style={fm.label}>Phone</Text>
            <TextInput style={fm.input} placeholder="+639XXXXXXXXX" placeholderTextColor={C.muted}
              keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

            <Text style={fm.label}>Company</Text>
            <TextInput style={fm.input} placeholder="Company name" placeholderTextColor={C.muted}
              value={company} onChangeText={setCompany} />

            <Text style={fm.label}>Tags</Text>
            <View style={fm.tagInputRow}>
              <TextInput
                style={[fm.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add a tag" placeholderTextColor={C.muted}
                value={tagInput} onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
              <Pressable style={fm.addTagBtn} onPress={addTag}>
                <Text style={fm.addTagBtnText}>Add</Text>
              </Pressable>
            </View>
            <View style={fm.tagsRow}>
              {tags.map((t) => (
                <Pressable key={t} style={fm.tag} onPress={() => removeTag(t)}>
                  <Text style={fm.tagText}>{t} ✕</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[fm.saveBtn, saving && fm.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={fm.saveBtnText}>{isEdit ? "Update Contact" : "Create Contact"}</Text>
              }
            </Pressable>

            <Pressable style={fm.cancelBtn} onPress={onClose}>
              <Text style={fm.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Contacts Screen ──────────────────────────────────────────────────────
export default function GHLContactsScreen() {
  const { creds, loading: credsLoading } = useGHLCredentials();
  const [contacts, setContacts]   = useState<GHLContact[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [error, setError]         = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editContact, setEditContact] = useState<GHLContact | undefined>();
  const [saving, setSaving]       = useState(false);

  const loadContacts = useCallback(async (reset = false) => {
    if (!creds) return;
    setLoading(true);
    setError("");
    try {
      const currentPage = reset ? 1 : page;
      const result = await getContacts(creds, search || undefined, currentPage);
      if (reset) {
        setContacts(result.contacts);
        setPage(1);
      } else {
        setContacts((prev) => [...prev, ...result.contacts]);
      }
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message ?? "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [creds, search, page]);

  useEffect(() => {
    if (creds) loadContacts(true);
  }, [creds, search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts(true);
  };

  const handleSaveContact = async (data: Partial<GHLContact>) => {
    if (!creds) return;
    setSaving(true);
    try {
      if (editContact?.id) {
        await updateContact(creds, editContact.id, data);
      } else {
        await createContact(creds, data);
      }
      setShowForm(false);
      setEditContact(undefined);
      loadContacts(true);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  if (credsLoading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator color={C.forestGreen} size="large" />
      </View>
    );
  }

  if (!creds) {
    return (
      <View style={s.loadingRoot}>
        <Text style={s.emptyIcon}>🔌</Text>
        <Text style={s.emptyText}>GHL not connected.{"\n"}Go to GHL Hub → ⚙️ to add credentials.</Text>
        <Pressable style={s.connectBtn} onPress={() => router.push("/ghl-settings" as any)}>
          <Text style={s.connectBtnText}>Connect GHL</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={s.headerTitle}>Contacts</Text>
          <Text style={s.headerSub}>{total > 0 ? `${total} total` : "GHL Contacts"}</Text>
        </View>
        <Pressable style={s.addBtn} onPress={() => { setEditContact(undefined); setShowForm(true); }}>
          <Text style={s.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Error */}
      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => loadContacts(true)}>
            <Text style={s.errorRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Contacts list */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.forestGreen}
            colors={[C.forestGreen]}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>
                {search ? `No contacts found for "${search}"` : "No contacts yet.\nTap '+ Add' to create one."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loading ? <ActivityIndicator color={C.forestGreen} style={{ padding: 20 }} /> : null
        }
        onEndReached={() => {
          if (!loading && contacts.length < total) {
            setPage((p) => p + 1);
            loadContacts(false);
          }
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.contactCard, pressed && s.contactCardPressed]}
            onPress={() => { setEditContact(item); setShowForm(true); }}
          >
            <View style={s.contactAvatar}>
              <Text style={s.contactAvatarText}>{getInitials(item)}</Text>
            </View>
            <View style={s.contactInfo}>
              <Text style={s.contactName}>{getFullName(item)}</Text>
              {item.email ? <Text style={s.contactMeta}>{item.email}</Text> : null}
              {item.phone ? <Text style={s.contactMeta}>{item.phone}</Text> : null}
              {item.tags && item.tags.length > 0 && (
                <View style={s.tagsRow}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {item.tags.length > 3 && (
                    <Text style={s.tagMore}>+{item.tags.length - 3}</Text>
                  )}
                </View>
              )}
            </View>
            <Text style={s.contactArrow}>›</Text>
          </Pressable>
        )}
      />

      {/* Contact Form Modal */}
      <ContactFormModal
        visible={showForm}
        contact={editContact}
        onClose={() => { setShowForm(false); setEditContact(undefined); }}
        onSave={handleSaveContact}
        saving={saving}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  loadingRoot: { flex: 1, backgroundColor: C.navy, alignItems: "center", justifyContent: "center", padding: 32 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.white, textAlign: "center" },
  headerSub: { fontSize: 12, color: C.muted, textAlign: "center" },
  addBtn: { backgroundColor: C.forestGreen, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  searchRow: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: {
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: C.white,
  },

  errorBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(224,90,90,0.08)", borderWidth: 0.5,
    borderColor: "rgba(224,90,90,0.3)", borderRadius: 10,
    marginHorizontal: 20, padding: 12, marginBottom: 8,
  },
  errorText: { fontSize: 13, color: C.error, flex: 1 },
  errorRetry: { fontSize: 13, color: C.forestGreen, fontWeight: "600" },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },

  emptyContainer: { alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 14 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },
  connectBtn: {
    backgroundColor: C.forestGreen, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 12, marginTop: 16,
  },
  connectBtnText: { fontSize: 14, fontWeight: "700", color: C.white },

  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  contactCardPressed: { opacity: 0.75 },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.forestGreen, alignItems: "center", justifyContent: "center",
  },
  contactAvatarText: { fontSize: 16, fontWeight: "700", color: C.white },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "600", color: C.white, marginBottom: 2 },
  contactMeta: { fontSize: 12, color: C.muted, marginBottom: 1 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  tag: {
    backgroundColor: "rgba(29,158,117,0.12)", borderWidth: 0.5,
    borderColor: "rgba(29,158,117,0.3)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: C.forestGreen, fontWeight: "500" },
  tagMore: { fontSize: 10, color: C.muted, alignSelf: "center" },
  contactArrow: { fontSize: 20, color: C.muted },
});

const fm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.navyCard, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    maxHeight: "90%",
  },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: C.white, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: C.offWhite, marginBottom: 6 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.white, marginBottom: 14,
  },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  addTagBtn: {
    backgroundColor: C.forestGreen, paddingHorizontal: 16,
    borderRadius: 10, justifyContent: "center",
  },
  addTagBtnText: { fontSize: 13, fontWeight: "700", color: C.white },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  tag: {
    backgroundColor: "rgba(29,158,117,0.12)", borderWidth: 0.5,
    borderColor: "rgba(29,158,117,0.3)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: C.forestGreen },
  saveBtn: {
    backgroundColor: C.forestGreen, paddingVertical: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 10,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: C.white },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 14, color: C.muted },
});