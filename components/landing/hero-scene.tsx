'use client';

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

const PARTICLE_COUNT = 60;
const STIFFNESS = 2.8;
const DAMPING = 0.08;
const DISPERSION_FORCE = 12;

interface Particle {
  originalPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  velocity: THREE.Vector3;
}

function generateSphere(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const gr = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = 2 * Math.PI * i / gr;
    const phi = Math.acos(1 - 2 * (i + 0.5) / n);
    points.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    ));
  }
  return points;
}

function CrystalNode({ onStateChange }: { onStateChange: (s: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shellRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dummyColor = useMemo(() => new THREE.Color(), []);
  const v3 = useMemo(() => new THREE.Vector3(), []);

  const originals = useMemo(() => generateSphere(PARTICLE_COUNT, 1.6), []);
  const particles = useMemo(() => originals.map(p => ({
    originalPos: p.clone(),
    currentPos: p.clone(),
    velocity: new THREE.Vector3(),
  })), []);

  const clickPoint = useRef<THREE.Vector3 | null>(null);
  const isExploding = useRef(false);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isExploding.current) return;
    clickPoint.current = e.point.clone();
    isExploding.current = true;
    onStateChange('exploding');

    particles.forEach(p => {
      const dir = p.currentPos.clone().sub(clickPoint.current!).normalize();
      const dist = Math.max(p.currentPos.distanceTo(clickPoint.current!), 0.3);
      p.velocity.copy(dir.multiplyScalar(DISPERSION_FORCE / dist));
    });

    setTimeout(() => {
      isExploding.current = false;
      clickPoint.current = null;
      onStateChange('idle');
    }, 3500);
  }, [onStateChange]);

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    groupRef.current.rotation.y += dt * 0.03;
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.08;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];

      const spring = new THREE.Vector3().subVectors(p.originalPos, p.currentPos).multiplyScalar(STIFFNESS);
      const damp = p.velocity.clone().multiplyScalar(-DAMPING);

      p.velocity.add(spring.add(damp).multiplyScalar(dt));
      p.currentPos.add(p.velocity.clone().multiplyScalar(dt));

      const intensity = isExploding.current ? Math.min(p.velocity.length() * 0.15, 1) : 0;
      const baseBrightness = 0.65;
      const r = baseBrightness + intensity * 0.35;
      const g = baseBrightness + intensity * 0.05;
      const b = baseBrightness + intensity * 0.12;
      dummyColor.setRGB(r, g, b);
      meshRef.current!.setColorAt(i, dummyColor);

      const scale = 0.06 + intensity * 0.04 + Math.sin(t * 2 + i * 0.3) * 0.008;
      dummy.position.copy(p.currentPos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    if (shellRef.current) {
      for (let i = 0; i < 20; i++) {
        const idx = i % PARTICLE_COUNT;
        const pos = particles[idx].currentPos;
        const scale = isExploding.current ? 1.8 + Math.sin(t * 4 + i) * 0.1 : 1.0;
        dummy.position.copy(pos);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        shellRef.current.setMatrixAt(i, dummy.matrix);
      }
      shellRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const shellPositions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 20; i++) {
      const idx = i % PARTICLE_COUNT;
      const o = originals[idx];
      arr.push(o.x, o.y, o.z);
    }
    return new Float32Array(arr);
  }, [originals]);

  return (
    <group ref={groupRef} onClick={handleClick}>
      <instancedMesh ref={shellRef} args={[undefined, undefined, 20]}>
        <octahedronGeometry args={[2.4, 0]} />
        <meshBasicMaterial color="#1a1a24" wireframe transparent opacity={0.15} />
      </instancedMesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#c8c8d8"
          metalness={0.95}
          roughness={0.05}
          emissive="#303050"
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

export function HeroScene({ onStateChange }: { onStateChange: (s: string) => void }) {
  return (
    <div className="w-full h-full cursor-pointer">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        style={{ background: '#07070a' }}
      >
        <CrystalNode onStateChange={onStateChange} />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.85}
            luminanceSmoothing={0.02}
            intensity={0.7}
            mipmapBlur
            kernelSize={4}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
