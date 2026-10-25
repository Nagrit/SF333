
import { Text, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

export interface SelectedPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

type Props = {
  apiKey: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (place: SelectedPlace) => void;
};

export default function PlaceAutocomplete({
  apiKey,
  value,
  onChangeText,
  onSelect,
}: Props) {
  return (
    <View style={{ marginBottom: 12, zIndex: 10 }}>
      <GooglePlacesAutocomplete
        placeholder="ค้นหาร้านอาหารหรือสถานที่..."
        fetchDetails
        debounce={300}
        enablePoweredByContainer={false}
        keyboardShouldPersistTaps="handled"
        query={{
          key: apiKey,
          language: 'th',
          components: 'country:th',
        }}
        textInputProps={{
          value,
          onChangeText,
          placeholderTextColor: '#94a3a2',
        }}
        styles={{
          container: { flex: 0, zIndex: 10 },
          textInput: {
            height: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e1eceb',
            backgroundColor: '#ffffff',
            paddingHorizontal: 14,
            fontSize: 14,
            color: '#1a2b2c',
          },
          listView: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            elevation: 4,
            zIndex: 20,
          },
          row: { padding: 12 },
          description: { color: '#1a2b2c' },
        }}
        onPress={(data, details) => {
          const location = details?.geometry?.location;

          if (!location) return;

          const place: SelectedPlace = {
            name: details?.name || data.description,
            address: details?.formatted_address || data.description,
            latitude: location.lat,
            longitude: location.lng,
            placeId: data.place_id,
          };

          onChangeText(place.name);
          onSelect(place);
        }}
        onFail={(error) => {
          console.error('Google Places error:', error);
        }}
      />
      <Text style={{ fontSize: 11, color: '#94a3a2', marginTop: 4 }}>
        เลือกสถานที่จากผลการค้นหาเพื่อบันทึกพิกัด
      </Text>
    </View>
  );
}
