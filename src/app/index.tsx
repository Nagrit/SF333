// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getToken } from '../services/api'; // เรียกใช้ getToken จาก services/api

export default function EntryScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasValidToken, setHasValidToken] = useState(false);


    // app/index.tsx
    useEffect(() => {
        const verifyToken = async () => {
            console.log('🔍 [app/index.tsx] Starting verifyToken...');
            const token = await getToken();
            console.log('🔍 [app/index.tsx] Token result:', token ? 'FOUND TOKEN' : 'NULL / NOT FOUND');

            if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
                setHasValidToken(true);
            } else {
                setHasValidToken(false);
            }
            setIsLoading(false);
        };

        verifyToken();
    }, []);

    useEffect(() => {
        const verifyToken = async () => {
            try {
                // ดึง Token ผ่าน getToken() ที่ใช้ SecureStore
                const token = await getToken();

                if (
                    token &&
                    token !== 'null' &&
                    token !== 'undefined' &&
                    token.trim() !== ''
                ) {
                    setHasValidToken(true);
                } else {
                    setHasValidToken(false);
                }
            } catch (error) {
                setHasValidToken(false);
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#cce1de' }}>
                <ActivityIndicator size="large" color="#468f92" />
            </View>
        );
    }

    if (hasValidToken) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)/login" />;
}