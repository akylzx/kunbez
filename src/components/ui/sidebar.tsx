// src/components/ui/sidebar.tsx
import React from 'react'

interface SidebarProps {
  children?: React.ReactNode
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <div className={`sidebar ${className}`}>
      {children}
    </div>
  )
}

export default Sidebar