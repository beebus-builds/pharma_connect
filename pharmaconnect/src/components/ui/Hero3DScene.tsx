"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Brand palette mirrors tailwind.config.ts primary colors
const COLORS = {
  capLight: "#2f9480", // primary-500
  capDark: "#1c6256", // primary-700
  bubble: "#7dccb4", // primary-300
  rim: "#4bb096", // primary-400
};

/** Two-tone glossy capsule with a subtle waist seam ring. */
function Pill() {
  const group = useRef<THREE.Group>(null);
  const matLight = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: COLORS.capLight,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    []
  );
  const matDark = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: COLORS.capDark,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
      }),
    []
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 0.45;
    g.rotation.z = 0.45 + Math.sin(t * 0.7) * 0.05;
    g.position.y = Math.sin(t * 1.2) * 0.09;
  });

  return (
    <group ref={group}>
      <mesh material={matLight} position={[0, 0.56, 0]}>
        <capsuleGeometry args={[0.5, 1.05, 8, 32]} />
      </mesh>
      <mesh material={matDark} position={[0, -0.56, 0]}>
        <capsuleGeometry args={[0.5, 1.05, 8, 32]} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.508, 0.014, 12, 64]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.4} />
      </mesh>
    </group>
  );
}

interface BubbleSeed {
  angle: number;
  radius: number;
  y0: number;
  speed: number;
  scale: number;
}

/** Deterministic pseudo-random in 0..1 (pure, lint-safe). */
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Soft micro-bubbles orbiting the capsule for atmosphere. */
function Bubbles({ count = 14 }: { count?: number }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo<BubbleSeed[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2 + jitter(i, 1) * 0.6,
        radius: 1.15 + jitter(i, 2) * 0.65,
        y0: -1.5 + jitter(i, 3) * 3,
        speed: 0.15 + jitter(i, 4) * 0.35,
        scale: 0.03 + jitter(i, 5) * 0.05,
      })),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      m.position.set(
        Math.cos(s.angle + t * s.speed) * s.radius,
        s.y0 + Math.sin(t * s.speed * 2 + i) * 0.35,
        Math.sin(s.angle + t * s.speed) * s.radius
      );
    });
  });

  return (
    <group>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          scale={s.scale}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={COLORS.bubble}
            emissive={COLORS.capDark}
            emissiveIntensity={0.35}
            transparent
            opacity={0.45}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Tilts the whole composition toward the pointer (frame-rate independent). */
function PointerTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.pow(0.002, delta);
    g.rotation.y += (state.pointer.x * 0.35 - g.rotation.y) * k;
    g.rotation.x += (state.pointer.y * 0.22 - g.rotation.x) * k;
  });

  return <group ref={ref}>{children}</group>;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} color={COLORS.bubble} />
      <pointLight position={[0, 0, 3]} intensity={6} distance={9} color={COLORS.rim} />
    </>
  );
}

export default function Hero3DScene({ paused = false }: { paused?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      frameloop={paused ? "never" : "always"}
      style={{ background: "transparent" }}
    >
      <Lights />
      <PointerTilt>
        <Pill />
      </PointerTilt>
      <Bubbles />
    </Canvas>
  );
}
