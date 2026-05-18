import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { queueSyncAction } from '../../database/db';

export default function AddTrainerScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [mobile, setMobile] = useState('');

  const handleSave = async () => {
    if (!name || !empId || !mobile) {
        Alert.alert("Missing Fields", "Please complete all fields.");
        return;
    }

    const payload = {
        full_name: name,
        employee_id: empId,
        mobile_number: mobile,
        role: 'TRAINER',
        timestamp: new Date().toISOString()
    };

    try {
        await queueSyncAction('CreateTrainer', payload);
        Alert.alert("Success", "Trainer added to offline sync queue!");
        navigation.goBack();
    } catch (e) {
        console.error("Failed to queue Add Trainer:", e);
        Alert.alert("Error", "Could not save locally.");
    }
  };

  return (
    <View style={s.root}>
        <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
                <MaterialIcons name="arrow-back" size={24} color={C.t1} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Add New Trainer</Text>
            <TouchableOpacity onPress={handleSave} style={s.saveBtn}>
                <Text style={s.saveTxt}>SAVE</Text>
            </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>Trainer Details</Text>
            
            <View style={s.fieldGroup}>
                <Text style={s.label}>Full Name</Text>
                <TextInput 
                    style={s.input}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor={C.tMuted}
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View style={s.fieldGroup}>
                <Text style={s.label}>Employee ID</Text>
                <TextInput 
                    style={s.input}
                    placeholder="e.g. EMP-1052"
                    placeholderTextColor={C.tMuted}
                    value={empId}
                    onChangeText={setEmpId}
                />
            </View>

            <View style={s.fieldGroup}>
                <Text style={s.label}>Mobile Number</Text>
                <TextInput 
                    style={s.input}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={C.tMuted}
                    keyboardType="phone-pad"
                    value={mobile}
                    onChangeText={setMobile}
                />
            </View>
        </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: C.border
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
    saveBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    saveTxt: { color: '#fff', fontWeight: 'bold' },
    scroll: { padding: 16, gap: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: C.t1 },
    fieldGroup: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: C.t2 },
    input: {
        backgroundColor: 'rgba(30,41,59,0.5)', borderWidth: 1, borderColor: C.border,
        borderRadius: 12, height: 50, paddingHorizontal: 16, color: C.t1, fontSize: 16
    },
});
