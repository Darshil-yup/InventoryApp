import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

interface SplashScreenProviderProps {
    children: React.ReactNode;
}

export default function SplashScreenProvider({ children }: SplashScreenProviderProps) {
    const [isAppReady, setIsAppReady] = useState(false);
    const [isSplashComplete, setIsSplashComplete] = useState(false);

    // Use useRef to prevent re-creation on re-renders
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const ring1Scale = useRef(new Animated.Value(0)).current;
    const ring1Opacity = useRef(new Animated.Value(0.6)).current;
    const ring2Scale = useRef(new Animated.Value(0)).current;
    const ring2Opacity = useRef(new Animated.Value(0.4)).current;
    const ring3Scale = useRef(new Animated.Value(0)).current;
    const ring3Opacity = useRef(new Animated.Value(0.2)).current;
    const shimmerAnim = useRef(new Animated.Value(-1)).current;
    const bottomTextOpacity = useRef(new Animated.Value(0)).current;
    const bottomTextTranslateY = useRef(new Animated.Value(20)).current;
    const dot1Opacity = useRef(new Animated.Value(0.3)).current;
    const dot2Opacity = useRef(new Animated.Value(0.3)).current;
    const dot3Opacity = useRef(new Animated.Value(0.3)).current;
    const backgroundShift = useRef(new Animated.Value(0)).current;
    const particleAnims = useRef(
        Array.from({ length: 8 }, () => ({
            opacity: new Animated.Value(0),
            translateX: new Animated.Value(0),
            translateY: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: [-width * 0.8, width * 0.8],
    });

    const backgroundColorInterpolate = backgroundShift.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#0a0a1a', '#0d1b2a', '#0a0a1a'],
    });

    useEffect(() => {
        async function prepare() {
            try {
                // Phase 1: Initial entrance - logo fades in and scales up with a subtle rotation
                Animated.parallel([
                    Animated.timing(logoOpacity, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        tension: 20,
                        friction: 5,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 1200,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start();

                // Background subtle color shift loop
                Animated.loop(
                    Animated.timing(backgroundShift, {
                        toValue: 1,
                        duration: 4000,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: false,
                    })
                ).start();

                // Phase 2: Expanding rings
                setTimeout(() => {
                    // Ring 1
                    Animated.parallel([
                        Animated.timing(ring1Scale, {
                            toValue: 2.5,
                            duration: 1500,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                        Animated.timing(ring1Opacity, {
                            toValue: 0,
                            duration: 1500,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                    ]).start();

                    // Ring 2 (delayed)
                    setTimeout(() => {
                        Animated.parallel([
                            Animated.timing(ring2Scale, {
                                toValue: 2.5,
                                duration: 1500,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                            Animated.timing(ring2Opacity, {
                                toValue: 0,
                                duration: 1500,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                        ]).start();
                    }, 300);

                    // Ring 3 (more delayed)
                    setTimeout(() => {
                        Animated.parallel([
                            Animated.timing(ring3Scale, {
                                toValue: 2.5,
                                duration: 1500,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                            Animated.timing(ring3Opacity, {
                                toValue: 0,
                                duration: 1500,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                        ]).start();
                    }, 600);
                }, 600);

                // Phase 3: Particles burst outward
                setTimeout(() => {
                    particleAnims.forEach((particle, index) => {
                        const angle = (index / 8) * 2 * Math.PI;
                        const distance = 120 + Math.random() * 60;
                        const targetX = Math.cos(angle) * distance;
                        const targetY = Math.sin(angle) * distance;

                        Animated.parallel([
                            Animated.timing(particle.opacity, {
                                toValue: 0.8,
                                duration: 300,
                                useNativeDriver: true,
                            }),
                            Animated.timing(particle.scale, {
                                toValue: 1,
                                duration: 400,
                                useNativeDriver: true,
                            }),
                            Animated.timing(particle.translateX, {
                                toValue: targetX,
                                duration: 1200,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                            Animated.timing(particle.translateY, {
                                toValue: targetY,
                                duration: 1200,
                                easing: Easing.out(Easing.cubic),
                                useNativeDriver: true,
                            }),
                        ]).start(() => {
                            Animated.parallel([
                                Animated.timing(particle.opacity, {
                                    toValue: 0,
                                    duration: 600,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(particle.scale, {
                                    toValue: 0,
                                    duration: 600,
                                    useNativeDriver: true,
                                }),
                            ]).start();
                        });
                    });
                }, 800);

                // Phase 4: Pulse effect on logo
                setTimeout(() => {
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(pulseAnim, {
                                toValue: 1.08,
                                duration: 1000,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                            Animated.timing(pulseAnim, {
                                toValue: 1,
                                duration: 1000,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                        ])
                    ).start();

                    // Glow effect
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(glowAnim, {
                                toValue: 1,
                                duration: 1500,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                            Animated.timing(glowAnim, {
                                toValue: 0,
                                duration: 1500,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                        ])
                    ).start();
                }, 1200);

                // Phase 5: Shimmer across logo
                setTimeout(() => {
                    Animated.loop(
                        Animated.timing(shimmerAnim, {
                            toValue: 1,
                            duration: 2000,
                            easing: Easing.inOut(Easing.cubic),
                            useNativeDriver: true,
                        })
                    ).start();
                }, 1000);

                // Phase 6: Loading dots animation
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(bottomTextOpacity, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(bottomTextTranslateY, {
                            toValue: 0,
                            duration: 500,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }),
                    ]).start();

                    // Loading dots sequential animation
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                            Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                            Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                            Animated.delay(200),
                            Animated.parallel([
                                Animated.timing(dot1Opacity, { toValue: 0.3, duration: 200, useNativeDriver: true }),
                                Animated.timing(dot2Opacity, { toValue: 0.3, duration: 200, useNativeDriver: true }),
                                Animated.timing(dot3Opacity, { toValue: 0.3, duration: 200, useNativeDriver: true }),
                            ]),
                            Animated.delay(100),
                        ])
                    ).start();
                }, 1500);

                // Wait for the full splash experience
                await new Promise(resolve => setTimeout(resolve, 3500));

                setIsAppReady(true);
            } catch (error) {
                console.warn('Error during splash screen:', error);
                setIsAppReady(true);
            }
        }

        prepare();
    }, []);

    useEffect(() => {
        if (isAppReady) {
            // Exit animation: scale up logo and fade everything out
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 15,
                    duration: 800,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 800,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsSplashComplete(true);
                SplashScreen.hideAsync();
            });
        }
    }, [isAppReady]);

    if (!isSplashComplete) {
        return (
            <>
                {/* Background color layer (JS-driven) */}
                <Animated.View style={[styles.container, { backgroundColor: backgroundColorInterpolate }]} />

                {/* Content layer (native-driven) */}
                <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: 'transparent' }]}>
                    {/* Ambient gradient circles */}
                    <View style={styles.ambientContainer}>
                        <View style={[styles.ambientCircle, styles.ambientCircle1]} />
                        <View style={[styles.ambientCircle, styles.ambientCircle2]} />
                        <View style={[styles.ambientCircle, styles.ambientCircle3]} />
                    </View>

                    {/* Expanding rings */}
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                transform: [{ scale: ring1Scale }],
                                opacity: ring1Opacity,
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            styles.ring2,
                            {
                                transform: [{ scale: ring2Scale }],
                                opacity: ring2Opacity,
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            styles.ring3,
                            {
                                transform: [{ scale: ring3Scale }],
                                opacity: ring3Opacity,
                            },
                        ]}
                    />

                    {/* Particles */}
                    {particleAnims.map((particle, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.particle,
                                {
                                    opacity: particle.opacity,
                                    transform: [
                                        { translateX: particle.translateX },
                                        { translateY: particle.translateY },
                                        { scale: particle.scale },
                                    ],
                                },
                            ]}
                        />
                    ))}

                    {/* Glow behind logo */}
                    <Animated.View
                        style={[
                            styles.glowOuter,
                            {
                                opacity: glowAnim,
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.glowInner,
                            {
                                opacity: glowAnim,
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    />

                    {/* Logo */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: logoOpacity,
                                transform: [
                                    { scale: Animated.multiply(scaleAnim, pulseAnim) },
                                    { rotate: rotateInterpolate },
                                ],
                            },
                        ]}
                    >
                        <Image
                            source={require('../assets/images/splash-icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        {/* Shimmer overlay */}
                        <Animated.View
                            style={[
                                styles.shimmer,
                                {
                                    transform: [{ translateX: shimmerTranslate }],
                                },
                            ]}
                        />
                    </Animated.View>

                    {/* Loading dots at bottom */}
                    <Animated.View
                        style={[
                            styles.loadingContainer,
                            {
                                opacity: bottomTextOpacity,
                                transform: [{ translateY: bottomTextTranslateY }],
                            },
                        ]}
                    >
                        <View style={styles.dotsContainer}>
                            <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
                            <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
                            <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
                        </View>
                    </Animated.View>
                </Animated.View>
            </>
        );
    }

    return <>{children}</>;
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flex: 1,
        backgroundColor: '#0a0a1a',
        alignItems: 'center',
        justifyContent: 'center',
        width: width,
        height: height,
        overflow: 'hidden',
    },
    ambientContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ambientCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    ambientCircle1: {
        width: width * 1.2,
        height: width * 1.2,
        backgroundColor: 'rgba(56, 97, 251, 0.06)',
        top: -width * 0.3,
        left: -width * 0.2,
    },
    ambientCircle2: {
        width: width * 0.9,
        height: width * 0.9,
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        bottom: -width * 0.2,
        right: -width * 0.3,
    },
    ambientCircle3: {
        width: width * 0.6,
        height: width * 0.6,
        backgroundColor: 'rgba(6, 182, 212, 0.04)',
        top: height * 0.15,
        right: -width * 0.1,
    },
    logoContainer: {
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    logo: {
        width: 220,
        height: 220,
        backgroundColor: 'transparent',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        transform: [{ skewX: '-20deg' }],
    },
    glowOuter: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(56, 97, 251, 0.08)',
    },
    glowInner: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
    },
    ring: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: 'rgba(56, 97, 251, 0.4)',
        backgroundColor: 'transparent',
    },
    ring2: {
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    ring3: {
        borderColor: 'rgba(6, 182, 212, 0.25)',
    },
    particle: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(147, 130, 255, 0.7)',
    },
    loadingContainer: {
        position: 'absolute',
        bottom: height * 0.12,
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(147, 130, 255, 0.9)',
    },
});