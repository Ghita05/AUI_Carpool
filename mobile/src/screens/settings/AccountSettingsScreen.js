import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert, Modal, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import ImagePickerModal from '../../components/ImagePickerModal';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, updatePreferences, changePassword as changePasswordAPI, deactivateAccount, uploadDriverLicense } from '../../services/authService';
import { getVehicles, addVehicle, modifyVehicle } from '../../services/vehicleService';

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

  // Vehicle state (loaded from API for drivers)
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vBrand,setVBrand]=useState('');const [vModel,setVModel]=useState('');const [vColor,setVColor]=useState('');const [vYear,setVYear]=useState('');const [vPlate,setVPlate]=useState('');const [vSize,setVSize]=useState('Medium');const [vLug,setVLug]=useState(3);
  const [regCardUri, setRegCardUri] = useState(null);

  // Document upload state
  const [driverLicenseUri, setDriverLicenseUri] = useState(user?.driverLicenseImage || null);
  const [driverLicenseVerified, setDriverLicenseVerified] = useState(user?.driverLicenseVerified || false);
  const [uploading, setUploading] = useState(null); // 'license' | 'regcard' | null

  const [showPwModal,setShowPwModal]=useState(false);const [showDeactivate,setShowDeactivate]=useState(false);
  const [saveStatus,setSaveStatus]=useState('');
  // Image picker modal state: which upload is requesting a photo
  const [pickerFor, setPickerFor] = useState(null); // 'license' | 'regcard' | null

  // Load driver's vehicle on mount
  useEffect(() => {
    if (isDriver) {
      setVehicleLoading(true);
      getVehicles().then(res => {
        const vehicles = res.data?.vehicles || [];
        if (vehicles.length > 0) {
          const v = vehicles[0];
          setVehicle(v);
          setVBrand(v.brand || ''); setVModel(v.model || ''); setVColor(v.color || '');
          setVYear(String(v.year || '')); setVPlate(v.licensePlate || '');
          setVSize(v.sizeCategory || 'Medium'); setVLug(v.luggageCapacity || 3);
        }
      }).catch(() => {}).finally(() => setVehicleLoading(false));
    }
  }, [isDriver]);

  const handleImagePicked = (uri) => {
    if (!uri || !pickerFor) return;
    if (pickerFor === 'license') processDriverLicenseImage(uri);
    else if (pickerFor === 'regcard') processRegCardImage(uri);
  };

  const processDriverLicenseImage = async (uri) => {
    setUploading('license');
    try {
      const res = await uploadDriverLicense(uri);
      setDriverLicenseUri(uri);
      const ocr = res.data?.ocrResult;
      setDriverLicenseVerified(ocr?.verified && ocr?.nameMatch !== false);

      if (ocr?.verified) {
        // Name mismatch check
        if (ocr.nameMatch === false) {
          Alert.alert(
            'Name Mismatch',
            `The name on your driver license (${ocr.holderName || 'unknown'}) does not match your registered name (${firstName} ${lastName}).\n\nPlease upload a license that belongs to you.`,
            [{ text: 'OK' }]
          );
          return;
        }
        const info = [
          ocr.holderName && `• Name: ${ocr.holderName}`,
          ocr.licenseNumber && `• License #: ${ocr.licenseNumber}`,
          ocr.cni && `• CNI: ${ocr.cni}`,
        ].filter(Boolean).join('\n');
        Alert.alert('License Verified', `Extracted info:\n${info}`);
      } else {
        Alert.alert('Upload Saved', 'Image uploaded but auto-verification could not extract info. An admin may review it manually.');
      }
    } catch (err) {
      Alert.alert('Upload Failed', err.response?.data?.message || 'Could not upload driver license image.');
    } finally { setUploading(null); }
  };

  const handleDriverLicenseUpload = () => setPickerFor('license');

  const processRegCardImage = (uri) => {
    setRegCardUri(uri);
    Alert.alert('Photo Selected', 'Registration card will be OCR-processed when you save vehicle changes.');
  };

  const handleRegCardUpload = () => setPickerFor('regcard');

  const handleSave=async()=>{
  try{
    await updateProfile({phoneNumber:phone});
    await updatePreferences({smokingPreference:smoking,drivingStyle:driving});
    setUser(prev => prev ? {...prev, phoneNumber:phone, smokingPreference:smoking, drivingStyle:driving} : prev);
    setEditing(false);setSaveStatus('Saved!');setTimeout(()=>setSaveStatus(''),2000);
  }catch(err){Alert.alert('Error',err.response?.data?.message||'Failed to save');}
};

  const handleVehicleSave = async () => {
    const vehicleData = { brand: vBrand, model: vModel, color: vColor, year: vYear, licensePlate: vPlate, sizeCategory: vSize, luggageCapacity: vLug };
    try {
      let res;
      if (vehicle?._id) {
        res = await modifyVehicle(vehicle._id, vehicleData, regCardUri);
      } else {
        res = await addVehicle(vehicleData, regCardUri);
      }
      const v = res.data?.vehicle;
      if (v) { setVehicle(v); setVPlate(v.licensePlate || vPlate); }
      const ocr = res.data?.ocrResult;
      if (ocr) {
        // Check if registration card is expired
        if (ocr.isExpired) {
          Alert.alert('Expired Registration', `The registration card expired on ${ocr.expiryDate}. Please upload a valid carte grise.`);
          return;
        }
        // Owner name mismatch warning
        if (ocr.ownerNameMatch === false && ocr.ownerName) {
          Alert.alert(
            'Owner Name Mismatch',
            `The proprietaire on the carte grise (${ocr.ownerName}) does not match your name (${firstName} ${lastName}).\n\nIf this vehicle is registered to someone else, please upload your own registration card.`,
            [{ text: 'OK' }]
          );
        }
        if (ocr.verified && ocr.licensePlate) {
          setVPlate(ocr.licensePlate);
          if (ocr.ownerNameMatch !== false && !ocr.isExpired) {
            Alert.alert('Vehicle Saved & Verified', `License plate extracted: ${ocr.licensePlate}${ocr.expiryDate ? '\nValid until: ' + ocr.expiryDate : ''}`);
          }
        } else {
          Alert.alert('Vehicle Saved', 'Vehicle information has been updated.');
        }
      } else {
        Alert.alert('Vehicle Saved', 'Vehicle information has been updated.');
      }
      setRegCardUri(null);
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save vehicle.');
    }
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
            <View style={{flex:1}}><Text style={st.fLabel}>First Name</Text>
              <View style={st.emailLocked}><Ionicons name="lock-closed" size={13} color={Colors.primary}/><Text style={{flex:1,fontSize:13,color:Colors.textPrimary}}>{firstName}</Text></View>
            </View>
            <View style={{flex:1}}><Text style={st.fLabel}>Last Name</Text>
              <View style={st.emailLocked}><Ionicons name="lock-closed" size={13} color={Colors.primary}/><Text style={{flex:1,fontSize:13,color:Colors.textPrimary}}>{lastName}</Text></View>
            </View>
          </View>
          <Text style={st.fLabel}>AUI Email</Text>
          <View style={st.emailLocked}><Ionicons name="lock-closed" size={13} color={Colors.primary}/><Text style={{flex:1,fontSize:13,color:Colors.textPrimary}}>{user.email||'g.nafa@aui.ma'}</Text><Text style={{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary}}>✓ Verified</Text></View>
          <Text style={{fontSize:10,color:Colors.textSecondary,marginTop:2,marginBottom:4}}>Name and email cannot be changed after registration</Text>
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
            {vehicleLoading ? <ActivityIndicator color={Colors.primary}/> : <>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={st.fLabel}>Brand</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vBrand} onChangeText={setVBrand} editable={editing}/></View>
              <View style={{flex:1}}><Text style={st.fLabel}>Model</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vModel} onChangeText={setVModel} editable={editing}/></View>
            </View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={st.fLabel}>Color</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vColor} onChangeText={setVColor} editable={editing}/></View>
              <View style={{flex:1}}><Text style={st.fLabel}>Year</Text><TextInput style={[st.fInput,!editing&&st.fInputDisabled]} value={vYear} onChangeText={setVYear} editable={editing}/></View>
            </View>
            <Text style={st.fLabel}>License Plate</Text>
            <View style={st.emailLocked}><Ionicons name="lock-closed" size={13} color={Colors.primary}/><Text style={{flex:1,fontSize:13,color:Colors.textPrimary}}>{vPlate || 'Upload registration card to extract'}</Text>
              {vehicle?.registrationCardVerified && <Text style={{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary}}>✓ Verified</Text>}
            </View>
            <Text style={{fontSize:10,color:Colors.textSecondary,marginTop:2,marginBottom:4}}>License plate is extracted from your registration card via OCR</Text>
            <Text style={[st.fLabel,{marginTop:8}]}>Vehicle Size</Text><Pills options={['Small','Medium','Large']} selected={vSize} onSelect={setVSize} disabled={!editing}/>
            <Text style={[st.fLabel,{marginTop:8}]}>Registration Card</Text>
            <TouchableOpacity style={[st.carUpload, regCardUri && st.uploadDone]} onPress={editing ? handleRegCardUpload : undefined} disabled={!editing}>
              {uploading === 'regcard' ? <ActivityIndicator size="small" color={Colors.primary}/> :
              <>
                <Ionicons name={regCardUri ? 'checkmark-circle' : 'camera-outline'} size={20} color={editing ? Colors.primary : Colors.textDisabled}/>
                <Text style={{fontSize:13,color:editing?Colors.primary:Colors.textDisabled}}>{regCardUri ? 'New photo selected' : vehicle?.registrationCardImage ? 'Re-upload registration card' : 'Upload registration card photo'}</Text>
              </>}
            </TouchableOpacity>
            {editing && (
              <TouchableOpacity style={[st.saveFab, {marginTop: Spacing.md}]} onPress={handleVehicleSave}>
                <Text style={st.saveFabText}>Save Vehicle</Text>
              </TouchableOpacity>
            )}
            </>}
          </Card>
        )}

        {/* Document Verification (driver only — license & vehicle card can expire) */}
        {isDriver && (
          <Card title="Document Verification">
            <Text style={st.fLabel}>Driver License</Text>
            <TouchableOpacity style={[st.docUploadRow, driverLicenseVerified && st.docVerified]} onPress={handleDriverLicenseUpload}>
              {uploading === 'license' ? <ActivityIndicator size="small" color={Colors.primary}/> :
              <>
                <Ionicons name={driverLicenseVerified ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={driverLicenseVerified ? Colors.primary : Colors.textSecondary}/>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:driverLicenseVerified?Colors.primary:Colors.textPrimary}}>
                    {driverLicenseVerified ? 'License Verified' : driverLicenseUri ? 'Re-upload License' : 'Upload Driver License'}
                  </Text>
                  <Text style={{fontSize:11,color:Colors.textSecondary}}>OCR extracts license number, name & CNI</Text>
                </View>
                {driverLicenseVerified && <View style={st.verifiedChip}><Text style={st.verifiedChipText}>✓ Verified</Text></View>}
              </>}
            </TouchableOpacity>
            <Text style={{fontSize:10,color:Colors.textSecondary,marginTop:2,marginBottom:8}}>You can re-upload your license if it expires or needs updating</Text>
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
      <ImagePickerModal
        visible={!!pickerFor}
        onClose={() => setPickerFor(null)}
        onImage={handleImagePicked}
        aspect={[86, 54]}
        title={pickerFor === 'license' ? 'Upload Driver License' : 'Upload Registration Card'}
      />
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
  uploadDone:{borderStyle:'solid',borderColor:Colors.primary,backgroundColor:Colors.primaryBg},
  docUploadRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,paddingHorizontal:12,borderWidth:1,borderColor:Colors.border,borderRadius:8,marginBottom:4},
  docVerified:{borderColor:Colors.primary,backgroundColor:Colors.primaryBg},
  verifiedChip:{backgroundColor:Colors.primary,paddingHorizontal:8,paddingVertical:3,borderRadius:12},
  verifiedChipText:{fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
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
