"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Line, Sparkles } from "@react-three/drei";
import * as THREE from "three";

interface SceneProps {
  quality: "full" | "light";
  animate: boolean;
}

const PLATFORM_COLORS = ["#22d3ee", "#fb923c", "#a78bfa", "#22d3ee"];

function OrbitRing({
  radius,
  tilt,
  nodeCount,
  animate,
  colorOffset,
}: {
  radius: number;
  tilt: [number, number, number];
  nodeCount: number;
  animate: boolean;
  colorOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const ringPoints = useMemo(() => {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return points;
  }, [radius]);

  const nodeAngles = useMemo(
    () => Array.from({ length: nodeCount }, (_, i) => (i / nodeCount) * Math.PI * 2),
    [nodeCount],
  );

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group rotation={tilt}>
      <Line points={ringPoints} color="#3f3f52" lineWidth={1} transparent opacity={0.5} />
      <group ref={groupRef}>
        {nodeAngles.map((angle, i) => {
          const position: [number, number, number] = [
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius,
          ];
          const color = PLATFORM_COLORS[(i + colorOffset) % PLATFORM_COLORS.length];
          return (
            <group key={angle}>
              <mesh position={position}>
                <sphereGeometry args={[0.09, 16, 16]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={1.4}
                  toneMapped={false}
                />
              </mesh>
              <Line
                points={[[0, 0, 0], position]}
                color={color}
                lineWidth={1}
                transparent
                opacity={0.35}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}

function ProductCore({ animate }: { animate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!animate || !meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.x += delta * 0.04;
  });

  return (
    <Float speed={animate ? 1.4 : 0} rotationIntensity={animate ? 0.35 : 0} floatIntensity={animate ? 0.7 : 0}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#6d28d9"
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.18} />
      </mesh>
    </Float>
  );
}

function ParallaxRig({ children, animate }: { children: React.ReactNode; animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useThree((state) => state.pointer);

  useFrame(() => {
    if (!groupRef.current) return;
    const targetX = animate ? pointer.y * 0.18 : 0;
    const targetY = animate ? pointer.x * 0.25 : 0;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.04;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.04;
  });

  return <group ref={groupRef}>{children}</group>;
}

function SceneContent({ quality, animate }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 3, 4]} intensity={40} color="#8b5cf6" />
      <pointLight position={[-4, -2, -3]} intensity={25} color="#22d3ee" />

      <ParallaxRig animate={animate}>
        <ProductCore animate={animate} />
        <OrbitRing radius={2.1} tilt={[0.5, 0, 0.15]} nodeCount={3} animate={animate} colorOffset={0} />
        <OrbitRing radius={2.75} tilt={[-0.35, 0.6, 0]} nodeCount={4} animate={animate} colorOffset={1} />
        {quality === "full" ? (
          <Sparkles count={70} scale={5.5} size={2.2} speed={animate ? 0.25 : 0} color="#fb923c" />
        ) : null}
      </ParallaxRig>
    </>
  );
}

export function ProductCoreScene({ quality, animate }: SceneProps) {
  return (
    <Canvas
      dpr={[1, quality === "full" ? 2 : 1]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: quality === "full", alpha: true, powerPreference: "low-power" }}
    >
      <SceneContent quality={quality} animate={animate} />
    </Canvas>
  );
}
