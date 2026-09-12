import { useRouter } from 'expo-router';
import { Briefcase, Check, Coffee, Hourglass, MapPin, Plane, Search, User } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SchedulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State สำหรับควบคุมการเปิด/ปิดช่องค้นหาและฟิลเตอร์
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, confirmed, pending
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, food, trip, work, personal

  // หมวดหมู่ตามที่คุณต้องการ
  const CATEGORIES = [
    { key: 'all', label: 'ทุกประเภท', color: '#1c4e4e' },
    { key: 'food', label: 'นัดกินข้าว / กาแฟ', color: '#f2a541', Icon: Coffee },
    { key: 'trip', label: 'นัดเที่ยว / กรุ๊ป', color: '#e2572b', Icon: Plane },
    { key: 'work', label: 'ทำงาน / ติวหนังสือ', color: '#2c3a33', Icon: Briefcase },
    { key: 'personal', label: 'ตัวเอง', color: '#8b6fd9', Icon: User }
  ];

  const sections = [
    {
      dateHeader: 'วันนี้ — 14 ก.พ. 2026',
      items: [
        { 
          id: '1', 
          time: '20:00 น.', 
          title: 'ชาบูกับชาวแก๊งค์ 🍲', 
          group: 'แก๊งแดกชาบู',
          location: 'ร้าน Shabu Baru (Siam Paragon)', 
          badge: 'ยืนยันแล้ว', 
          badgeBg: '#dcfce7', 
          badgeColor: '#16a34a', 
          categoryKey: 'food',
          category: 'นัดกินข้าว / กาแฟ',
          categoryBg: '#fef3c7',
          categoryColor: '#d97706',
          avatars: ['https://picsum.photos/seed/s1/100', 'https://picsum.photos/seed/s2/100', 'https://picsum.photos/seed/s3/100'],
          extraCount: 2,
          statusText: 'ว่างครบทุกคน (5/5)'
        },
      ]
    },
    {
      dateHeader: 'พรุ่งนี้ — 15 ก.พ. 2026',
      items: [
        { 
          id: '2', 
          time: '20:00 น.', 
          title: 'ทริปเที่ยวเขาใหญ่ 🚗', 
          group: 'แก๊ง 3 คน',
          location: 'อุทยานแห่งชาติเขาใหญ่', 
          badge: 'ยืนยันแล้ว', 
          badgeBg: '#dcfce7', 
          badgeColor: '#16a34a', 
          categoryKey: 'trip',
          category: 'นัดเที่ยว / กรุ๊ป',
          categoryBg: '#ffedd5',
          categoryColor: '#c2410c',
          avatars: ['https://picsum.photos/seed/s4/100', 'https://picsum.photos/seed/s5/100'],
          extraCount: 1,
          statusText: 'ว่างครบทุกคน (3/3)'
        }
      ]
    },
    {
      dateHeader: '18 ก.พ. 2026',
      items: [
        { 
          id: '3', 
          time: '13:00 น.', 
          title: 'ติวหนังสือสอบไฟนอล 📚', 
          group: 'เพื่อนร่วมคณะ',
          location: 'ห้องสมุดกลาง ม.ธรรมศาสตร์', 
          badge: 'รอยืนยัน', 
          badgeBg: '#fef3c7', 
          badgeColor: '#d97706', 
          categoryKey: 'work',
          category: 'ทำงาน / ติวหนังสือ',
          categoryBg: '#e2e8f0',
          categoryColor: '#334155',
          avatars: ['https://picsum.photos/seed/s7/100', 'https://picsum.photos/seed/s8/100'],
          extraCount: 3,
          statusText: 'รอการตอบรับ'
        }
      ]
    }
  ];

  // ฟังก์ชันสำหรับกรองข้อมูลตาม Search, Status และ Category
  const filteredSections = sections.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.group.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || 
                            (selectedStatus === 'confirmed' && item.badge === 'ยืนยันแล้ว') || 
                            (selectedStatus === 'pending' && item.badge === 'รอยืนยัน');

      const matchesCategory = selectedCategory === 'all' || item.categoryKey === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    })
  })).filter(sec => sec.items.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#cce1de' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={{ 
        backgroundColor: '#468f92', 
        paddingHorizontal: 20, 
        paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12) + 12, 
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>นัดหมายทั้งหมด</Text>
        <TouchableOpacity 
          onPress={() => setShowSearch(!showSearch)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Search color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        
        {/* Search Bar & Filters (แสดงเฉพาะตอนกดปุ่มค้นหา) */}
        {showSearch && (
          <View style={{ marginBottom: 16 }}>
            {/* Search Input */}
            <View style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: 16, 
              paddingHorizontal: 16, 
              height: 48, 
              flexDirection: 'row', 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#cbd5e1',
              marginBottom: 12,
              elevation: 2
            }}>
              <Search color="#9ca3af" size={18} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="ค้นหานัดหมาย, สถานที่, หรือกลุ่ม..."
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, fontSize: 14, color: '#1f2937' }}
              />
            </View>

            {/* Filter Chips Row 1: สถานะ */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity 
                onPress={() => setSelectedStatus('all')}
                style={{ 
                  backgroundColor: selectedStatus === 'all' ? '#1c4e4e' : '#ffffff', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#1c4e4e'
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: selectedStatus === 'all' ? '#ffffff' : '#1c4e4e' }}>ทั้งหมด</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setSelectedStatus('confirmed')}
                style={{ 
                  backgroundColor: selectedStatus === 'confirmed' ? '#dcfce7' : '#ffffff', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#16a34a',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Check size={12} color="#16a34a" />
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#16a34a' }}>ยืนยันแล้ว</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setSelectedStatus('pending')}
                style={{ 
                  backgroundColor: selectedStatus === 'pending' ? '#fef3c7' : '#ffffff', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#d97706',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Hourglass size={12} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#d97706' }}>รอยืนยัน</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips Row 2: หมวดหมู่ตาม CATEGORIES (เลื่อนดูได้แนวนอน) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const IconComponent = cat.Icon;
                return (
                  <TouchableOpacity 
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={{ 
                      backgroundColor: isSelected ? cat.color : '#ffffff', 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: cat.color,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {IconComponent && <IconComponent size={14} color={isSelected ? '#ffffff' : cat.color} />}
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSelected ? '#ffffff' : cat.color }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sections List */}
        {filteredSections.length > 0 ? (
          filteredSections.map((sec, secIdx) => (
            <View key={secIdx} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#294b4b', marginBottom: 8 }}>{sec.dateHeader}</Text>
              
              {sec.items.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => router.push('/appointment-detail')}
                  activeOpacity={0.85}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: 22, 
                    padding: 14, 
                    marginBottom: 12, 
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  {/* Time Box */}
                  <View style={{ 
                    backgroundColor: '#fde68a', 
                    borderRadius: 16, 
                    paddingVertical: 14, 
                    paddingHorizontal: 8, 
                    width: 74, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: 14 
                  }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#78350f' }}>{item.time.replace(' น.', '')}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#92400e', marginTop: 2 }}>น.</Text>
                  </View>

                  {/* Detail Box */}
                  <View style={{ flex: 1 }}>
                    {/* Tags Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: item.categoryBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.categoryColor }}>{item.category}</Text>
                      </View>
                      <View style={{ backgroundColor: item.badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.badgeColor }}>{item.badge}</Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 }}>{item.title}</Text>
                    
                    {/* Group Name */}
                    <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 6 }}>กลุ่ม: {item.group}</Text>

                    {/* Location */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 }}>
                      <MapPin size={13} color="#374151" />
                      <Text style={{ fontSize: 11, color: '#374151', fontWeight: '500' }}>{item.location}</Text>
                    </View>

                    {/* Avatars & Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', marginRight: 6 }}>
                          {item.avatars.map((url, idx) => (
                            <Image 
                              key={idx} 
                              source={{ uri: url }} 
                              style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ffffff', marginLeft: idx === 0 ? 0 : -8 }} 
                            />
                          ))}
                        </View>
                        <View style={{ backgroundColor: '#166534', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff' }}>+{item.extraCount}</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: 'bold' }}>{item.statusText}</Text>
                    </View>

                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#4b5563', fontWeight: '600' }}>ไม่พบนัดหมายที่คุณค้นหา</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}