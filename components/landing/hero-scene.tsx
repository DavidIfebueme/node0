'use client';

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const NODE_COUNT = 45;
const EDGE_DISTANCE = 1.2;

function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / n);
    points.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    ));
  }
  return points;
}

function ZeroNode({ onStateChange }: { onStateChange: (state: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const animState = useRef<'idle' | 'breaching' | 'tracing' | 'exposed' | 'reassembling'>('idle');
  const animTime = useRef(0);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dummyColor = useMemo(() => new THREE.Color(), []);

  const originalPositions = useMemo(() => fibonacciSphere(NODE_COUNT, 1.8), []);
  const targetPositions = useRef<THREE.Vector3[]>(originalPositions.map(p => p.clone()));
  const currentPositions = useRef<THREE.Vector3[]>(originalPositions.map(p => p.clone()));
  const nodeColorsArr = useRef<Float32Array>(new Float32Array(NODE_COUNT * 3).fill(0.91));
  const nodeScales = useRef<number[]>(Array(NODE_COUNT).fill(1));

  const edges = useMemo(() => {
    const e: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (originalPositions[i].distanceTo(originalPositions[j]) < EDGE_DISTANCE) {
          e.push([i, j]);
        }
      }
    }
    return e;
  }, [originalPositions]);

  const edgeOpacities = useRef<number[]>(Array(edges.length).fill(0.2));

  const centerNodeIndex = useMemo(() => {
    let closest = 0;
    let minDist = Infinity;
    originalPositions.forEach((p, i) => {
      const d = p.length();
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    });
    return closest;
  }, [originalPositions]);

  const prospectIndices = useMemo(() => {
    const indices: number[] = [];
    const outerNodes = originalPositions
      .map((p, i) => ({ i, d: p.length() }))
      .filter(x => x.d > 2.0)
      .sort((a, b) => b.d - a.d);
    for (let k = 0; k < Math.min(5, outerNodes.length); k++) {
      indices.push(outerNodes[k].i);
    }
    return indices;
  }, [originalPositions]);

  const connectedToCenter = useMemo(() => {
    return edges
      .filter(([a, b]) => a === centerNodeIndex || b === centerNodeIndex)
      .map(([a, b]) => a === centerNodeIndex ? b : a);
  }, [edges, centerNodeIndex]);

  const handleClick = useCallback(() => {
    if (animState.current !== 'idle') return;
    animState.current = 'breaching';
    animTime.current = 0;
    onStateChange('breaching');
  }, [onStateChange]);

  useEffect(() => {
    if (nodesRef.current) {
      for (let i = 0; i < NODE_COUNT; i++) {
        dummyColor.set('#e8e8ed');
        nodesRef.current.setColorAt(i, dummyColor);
      }
      nodesRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || !nodesRef.current) return;

    groupRef.current.rotation.y += delta * 0.05;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;

    const st = animState.current;
    animTime.current += delta;

    if (st === 'breaching' && animTime.current > 0.5) {
      animState.current = 'tracing';
      animTime.current = 0;
      onStateChange('tracing');
    }

    if (st === 'tracing') {
      dummyColor.set('#ff2d4a');
      nodesRef.current.setColorAt(centerNodeIndex, dummyColor);
      nodeScales.current[centerNodeIndex] = 2;

      if (animTime.current > 0.3) {
        connectedToCenter.forEach(idx => {
          dummyColor.set('#ff8a00');
          nodesRef.current!.setColorAt(idx, dummyColor);
          const dir = currentPositions.current[idx].clone().normalize();
          targetPositions.current[idx] = originalPositions[idx].clone().add(dir.multiplyScalar(2));
        });
      }

      if (animTime.current > 1.0) {
        prospectIndices.forEach(idx => {
          dummyColor.set('#00e5ff');
          nodesRef.current!.setColorAt(idx, dummyColor);
          nodeScales.current[idx] = 1.5;
          const dir = currentPositions.current[idx].clone().normalize();
          targetPositions.current[idx] = originalPositions[idx].clone().add(dir.multiplyScalar(3));
        });
      }

      if (animTime.current > 2.0) {
        animState.current = 'exposed';
        animTime.current = 0;
        onStateChange('exposed');
      }
    }

    if (st === 'exposed' && animTime.current > 2.0) {
      animState.current = 'reassembling';
      animTime.current = 0;
      onStateChange('reassembling');
      targetPositions.current = originalPositions.map(p => p.clone());
      for (let i = 0; i < NODE_COUNT; i++) {
        dummyColor.set('#e8e8ed');
        nodesRef.current.setColorAt(i, dummyColor);
        nodeScales.current[i] = 1;
      }
      edgeOpacities.current = Array(edges.length).fill(0.2);
    }

    if (st === 'reassembling' && animTime.current > 2.0) {
      animState.current = 'idle';
      animTime.current = 0;
      onStateChange('idle');
    }

    currentPositions.current.forEach((pos, i) => {
      pos.lerp(targetPositions.current[i], delta * 1.5);
      dummy.position.copy(pos);
      dummy.scale.setScalar(nodeScales.current[i]);
      dummy.updateMatrix();
      nodesRef.current!.setMatrixAt(i, dummy.matrix);
    });
    nodesRef.current.instanceMatrix.needsUpdate = true;
    if (nodesRef.current.instanceColor) nodesRef.current.instanceColor.needsUpdate = true;

    if (edgesRef.current) {
      const posAttr = edgesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      let idx = 0;
      edges.forEach(([a, b]) => {
        const startPos = currentPositions.current[a];
        const endPos = currentPositions.current[b];
        posAttr.setXYZ(idx++, startPos.x, startPos.y, startPos.z);
        posAttr.setXYZ(idx++, endPos.x, endPos.y, endPos.z);
      });
      posAttr.needsUpdate = true;
    }
  });

  const edgePositions = useMemo(() => {
    const arr = new Float32Array(edges.length * 6);
    let idx = 0;
    edges.forEach(([a, b]) => {
      const s = originalPositions[a];
      const e = originalPositions[b];
      arr[idx++] = s.x; arr[idx++] = s.y; arr[idx++] = s.z;
      arr[idx++] = e.x; arr[idx++] = e.y; arr[idx++] = e.z;
    });
    return arr;
  }, [edges, originalPositions]);

  const edgeColors = useMemo(() => {
    const arr = new Float32Array(edges.length * 6);
    for (let i = 0; i < edges.length; i++) {
      const c = 0.15;
      arr[i * 6] = c; arr[i * 6 + 1] = c; arr[i * 6 + 2] = c + 0.05;
      arr[i * 6 + 3] = c; arr[i * 6 + 4] = c; arr[i * 6 + 5] = c + 0.05;
    }
    return arr;
  }, [edges.length]);

  return (
    <group ref={groupRef} onClick={handleClick}>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.7} />
      </instancedMesh>

      <lineSegments ref={edgesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2a2a3a" transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

export function HeroScene({ onStateChange }: { onStateChange: (state: string) => void }) {
  return (
    <div className="w-full h-full cursor-pointer">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <color attach="background" args={['#07070a']} />
        <ZeroNode onStateChange={onStateChange} />
      </Canvas>
    </div>
  );
}
