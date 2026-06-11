'use client'

import { Suspense, lazy, Component, ReactNode } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  /** Rendered if the 3D scene fails to load (e.g. offline or blocked). */
  fallback?: ReactNode
}

// Local error boundary so a failed 3D scene never crashes the whole page.
class SplineBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    // Swallow — the fallback UI is shown instead.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const DefaultLoader = (
  <div className="w-full h-full flex items-center justify-center">
    <span className="loader"></span>
  </div>
)

export function SplineScene({ scene, className, fallback }: SplineSceneProps) {
  return (
    <SplineBoundary fallback={fallback ?? DefaultLoader}>
      <Suspense fallback={DefaultLoader}>
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineBoundary>
  )
}
