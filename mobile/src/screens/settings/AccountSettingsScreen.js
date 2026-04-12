import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, updatePreferences, changePassword as changePasswordAPI, deactivateAccount } from '../../services/authService';

function Card({title,children,action}){return(<View style={st.card}><View style={st.cardH}><Text style={st.cardTitle}>{title}</Text>{action}</View>{children}</View>);}
function Pills({options,selected,onSelect,disabled}){return(<View style={st.pillRow}>{options.map(o=>(<TouchableOpacity key={o} style={[st.pill,selected===o&&st.pillActive]} onPress={()=>!disabled&&onSelect(o)} disabled={disabled}><Text style={[st.pillText,selected===o&&st.pillTextActive]}>{o}</Text></TouchableOpacity>))}</View>);}

function ChangePasswordModal({visible,onClose}){
  const [cur,setCur]=useState('');const [nw,setNw]=useState('');const [conf,setConf]=useState('');const [loading,setLoading]=useState(false);
  const handleSave=async()=>{if(!cur||!nw||nw!==conf){Alert.alert('Error','Please fill all fields and make sure passwords match');return;}if(nw.length<8){Alert.alert('Error','Password must be at least 8 characters');return;}setLoading(true);try{await changePasswordAPI(cur,nw);onClose();Alert.alert('Success','Password updated');}catch(err){Alert.alert('Error',err.response?.data?.message||'Failed to change password');}finally{setLoading(false);}};
  return(<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={st.modalOv}><View style={st.modalContent}>
    <View style={st.modalH}><Text style={st.modalTitle}>Change Password</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
    {[{label:'Current Password',val:cur,set:setCur},{label:'New Password',val:nw,set:setNw},{label:'Confirm New Password',val:conf,set:setConf}].map((f,i)=>(
      <View key={i} style={{marginBottom:12}}><Text style={st.mLabel}>{f.label}</Text><TextInput style={st.mInput} secureTextEntry value={f.val} onChangeText={f.set} placeholder={f.label} placeholderTextColor={Colors.textDisabled}/></View>
    ))}
    <View style={{flexDirection:'row',gap:10,marginTop:8}}><TouchableOpacity style={st.cancelBtn} onPress={onClose}><Text style={st.cancelBtnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={st.saveBtn} onPress={handleSave}><Text style={st.saveBtnText}>{loading?'Saving...':'Update'}</Text></TouchableOpacity></View>
  </View></View></Modal>);
}

function DeactivateModal({visible,onClose}){
  const [confirmed,setConfirmed]=useState(false);
  return(<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={st.modalOv}><View style={st.modalContent}>
    <View style={st.modalH}><Text style={[st.modalTitle,{color:Colors.error}]}>Deactivate Account</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
    <Text style={{fontSize:13,color:Colors.textSecondary,marginBottom:16,lineHeight:20}}>This action cannot be undone. Your account and all data will be permanently deleted.</Text>
    <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}} onPress={()=>setConfirmed(c=>!c)}>
      <Ionicons name={confirmed?'checkbox':'square-outline'} size={20} color={confirmed?Colors.error:Colors.border}/>
      <Text style={{fontSize:13,color:Colors.textPrimary,flex:1}}>I understand and want to deactivate my account</Text>
    </TouchableOpacity>
    <View style={{flexDirection:'row',gap:10}}><TouchableOpacity style={st.cancelBtn} onPress={onClose}><Text style={st.cancelBtnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[st.saveBtn,{backgroundColor:confirmed?Colors.error:Colors.border}]} disabled={!confirmed} onPress={async()=>{try{await deactivateAccount();onClose();Alert.alert('Account Deactivated','Your account has been deactivated.');}catch(err){Alert.alert('Error',err.response?.data?.message||'Failed to deactivate');}}}><Text style={st.saveBtnText}>Deactivate</Text></TouchableOpacity></View>
  </View></View></Modal>);
}

export default function AccountSettingsScreen({ navigation }) {
  const { user, isDriver, logout, setUser } = useAuth();
  const [editing,setEditing]=useState(false);
  const [firstName,setFirstName]=useState(user?.firstName||'');
  const [lastName,setLastName]=useState(user?.lastName||'');
  const [phone,setPhone]=useState(user?.phoneNumber||'');
  const [smoking,setSmoking]=useState(user?.smokingPreference||'Non-smoker');
  const [driving,setDriving]=useState(user?.drivingStyle||'Calm');
  const [vBrand,setVBrand]=useState('Dacia');const [vModel,setVModel]=useState('Logan');const [vColor,setVColor]=useState('White');const [vYear,setVYear]=useState('2022');const [vPlate,setVPlate]=useState('12345-AB-67');const [vSize,setVSize]=useState('Medium');const [vLug,setVLug]=useState(3);
  const [showPwModal,setShowPwModal]=useState(false);const [showDeactivate,setShowDeactivate]=useState(false);
  const [saveStatus,setSaveStatus]=useState('');

  const handleSave=async()=>{
  try{
    await updateProfile({phoneNumber:phone});
    await updatePreferences({smokingPreference:smoking,drivingStyle:driving});
    // Update the in-memory user so the UI reflects changes immediately
    setUser(prev => prev ? {...prev, phoneNumber:phone, smokingPreference:smoking, drivingStyle:driving} : prev);
    setEditing(false);setSaveStatus('Saved!');setTimeout(()=>setSaveStatus(''),2000);
  }catch(err){Alert.alert('Error',err.response?.data?.message||'Failed to save');}
};
  const handleLogout=()=>{logout();navigation.reset({index:0,routes:[{name:'Splash'}]});};

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={st.headerBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary}/></TouchableOpacity>
        <Text style={st.headerTitle}>Settings</Text>
        <View style={{width:36}}/>
      </View>

      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={st.avatarSection}>
          <View style={st.avatarWrap}><Text style={st.avatarText}>{user.initials||'GN'}</Text></View>
          <TouchableOpacity onPress={()=>Alert.alert('Change Photo','Photo picker will open in the full version')}><Text style={st.changePhoto}>Change photo</Text></TouchableOpacity>
        </View>

        <Card title="Personal Information" action={<TouchableOpacity onPress={()=>setEditing(e=>!e)}><Text style={st.editLink}>{editing?'Lock':'Edit'}</Text></TouchableOpacity>}>
          <View style={{flexDirection:'row',gap:12}}>
            <View style={{flex:1}}><Text style={st.fLabel}>First Name</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={firstName} onChangeText={setFirstName} editable={editing}/></View>
            <View style={{flex:1}}><Text style={st.fLabel}>Last Name</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={lastName} onChangeText={setLastName} editable={editing}/></View>
          </View>
          <Text style={st.fLabel}>AUI Email</Text>
          <View style={st.emailLocked}><Ionicons name="lock-closed" size={13} color={Colors.primary}/><Text style={{flex:1,fontSize:13,color:Colors.textPrimary}}>{user.email||'g.nafa@aui.ma'}</Text><Text style={{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary}}>✓ Verified</Text></View>
          <Text style={st.fLabel}>Phone Number</Text>
          <TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={phone} onChangeText={setPhone} editable={editing}/>
        </Card>

        <Card title="Travel Preferences">
          <Text style={st.fLabel}>Smoking</Text>
          <Pills options={['Non-smoker','Smoker']} selected={smoking} onSelect={setSmoking} disabled={!editing}/>
          <Text style={[st.fLabel,{marginTop:12}]}>Driving Style</Text>
          <Pills options={['Calm','Moderate','Fast']} selected={driving} onSelect={setDriving} disabled={!editing}/>
        </Card>

        {isDriver && (
          <Card title="My Vehicle" action={<TouchableOpacity onPress={()=>setEditing(e=>!e)}><Text style={st.editLink}>{editing?'Lock':'Edit'}</Text></TouchableOpacity>}>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={st.fLabel}>Brand</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vBrand} onChangeText={setVBrand} editable={editing}/></View>
              <View style={{flex:1}}><Text style={st.fLabel}>Model</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vModel} onChangeText={setVModel} editable={editing}/></View>
            </View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={st.fLabel}>Color</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vColor} onChangeText={setVColor} editable={editing}/></View>
              <View style={{flex:1}}><Text style={st.fLabel}>Year</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vYear} onChangeText={setVYear} editable={editing}/></View>
            </View>
            <Text style={st.fLabel}>License Plate</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vPlate} onChangeText={setVPlate} editable={editing}/>
            <Text style={[st.fLabel,{marginTop:8}]}>Vehicle Size</Text><Pills options={['Small','Medium','Large']} selected={vSize} onSelect={setVSize} disabled={!editing}/>
            <Text style={[st.fLabel,{marginTop:8}]}>Vehicle Photo</Text>
            <TouchableOpacity style={st.carUpload} onPress={()=>editing&&Alert.alert('Upload Vehicle Photo','Camera/gallery picker will open in the full version')} disabled={!editing}>
              <Ionicons name="camera-outline" size={20} color={editing?Colors.primary:Colors.textDisabled}/>
              <Text style={{fontSize:13,color:editing?Colors.primary:Colors.textDisabled}}>Upload a photo of your vehicle</Text>
            </TouchableOpacity>
          </Card>
        )}

        <Card title="Security">
          <TouchableOpacity style={st.secRow} onPress={()=>setShowPwModal(true)}><Ionicons name="lock-closed-outline" size={16} color={Colors.textPrimary}/><Text style={st.secRowText}>Change Password</Text><Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/></TouchableOpacity>
          <View style={st.secDivider}/>
          <TouchableOpacity style={st.secRow} onPress={()=>setShowDeactivate(true)}><Ionicons name="trash-outline" size={16} color={Colors.error}/><Text style={[st.secRowText,{color:Colors.error}]}>Deactivate Account</Text><Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/></TouchableOpacity>
        </Card>

        {/* Logout */}
        <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error}/>
          <Text style={st.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {editing && <TouchableOpacity style={st.saveFab} onPress={handleSave}><Text style={st.saveFabText}>Save Changes</Text></TouchableOpacity>}
        {!!saveStatus && <Text style={st.saveMsg}>{saveStatus}</Text>}
        <View style={{height:40}}/>
      </ScrollView>

      <ChangePasswordModal visible={showPwModal} onClose={()=>setShowPwModal(false)}/>
      <DeactivateModal visible={showDeactivate} onClose={()=>setShowDeactivate(false)}/>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.background},
  header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.lg,backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},
  headerBtn:{width:36,height:36,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  scroll:{flex:1,padding:Spacing.lg},
  avatarSection:{alignItems:'center',marginBottom:Spacing.lg},
  avatarWrap:{width:72,height:72,borderRadius:36,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',marginBottom:8},
  avatarText:{fontSize:24,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  changePhoto:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  card:{backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.lg,marginBottom:Spacing.md,...Shadows.card},
  cardH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.md},
  cardTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  editLink:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  fLabel:{fontSize:10,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,textTransform:'uppercase',letterSpacing:.5,marginBottom:4,marginTop:10},
  fInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,fontSize:13,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary},
  fInputDisabled:{backgroundColor:Colors.divider,color:Colors.textSecondary},
  emailLocked:{flexDirection:'row',alignItems:'center',gap:8,height:42,backgroundColor:Colors.primaryBg,borderWidth:1,borderColor:Colors.primary,borderRadius:8,paddingHorizontal:12,marginBottom:4},
  pillRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  pill:{paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border},
  pillActive:{backgroundColor:Colors.primaryBg,borderColor:Colors.primary},
  pillText:{fontSize:12,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},
  pillTextActive:{color:Colors.primary,fontFamily:'PlusJakartaSans_600SemiBold'},
  carUpload:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,height:80,borderWidth:1.5,borderStyle:'dashed',borderColor:Colors.border,borderRadius:8,marginTop:4},
  secRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14},
  secRowText:{flex:1,fontSize:14,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary},
  secDivider:{height:1,backgroundColor:Colors.divider},
  logoutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,height:50,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.error,marginBottom:Spacing.md},
  logoutText:{fontSize:14,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.error},
  saveFab:{backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:14,alignItems:'center',marginBottom:Spacing.md},
  saveFabText:{fontSize:14,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  saveMsg:{textAlign:'center',fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.success,marginBottom:Spacing.md},
  modalOv:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'center',padding:Spacing.lg},
  modalContent:{backgroundColor:Colors.surface,borderRadius:Radius.lg,padding:Spacing.xl},
  modalH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.lg},
  modalTitle:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  mLabel:{fontSize:10,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4},
  mInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,fontSize:13,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary},
  cancelBtn:{flex:1,height:44,borderWidth:1,borderColor:Colors.border,borderRadius:8,alignItems:'center',justifyContent:'center'},
  cancelBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary},
  saveBtn:{flex:1,height:44,backgroundColor:Colors.primary,borderRadius:8,alignItems:'center',justifyContent:'center'},
  saveBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
});
