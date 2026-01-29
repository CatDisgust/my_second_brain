'use client';

import * as React from 'react';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
      mass: 0.8,
    },
  },
};

export type StaggerContainerProps = React.ComponentPropsWithoutRef<
  typeof motion.div
>;

export function StaggerContainer({
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      viewport={{ once: false }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type StaggerItemProps = React.ComponentPropsWithoutRef<typeof motion.div>;

export function StaggerItem({ children, ...props }: StaggerItemProps) {
  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}

