import {
  GraduationCap, Dumbbell, Briefcase, Leaf, Music, BookOpen, Heart,
  Sun, Moon, Apple, Bike, Code2, Coffee, Pencil, Star, Target, Zap,
  Timer, Trophy, Droplets, Camera, Utensils, Users, Smile, Flame,
  Globe, Headphones, Mountain, Palette, Shield, Bed, Wallet, Pill,
  Dog, Baby, Plane, ShoppingCart, Gamepad2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type IconEntry = { name: string; component: LucideIcon; label: string }

export const ICONS: IconEntry[] = [
  { name: 'Star',          component: Star,          label: 'Goals'      },
  { name: 'Dumbbell',      component: Dumbbell,      label: 'Fitness'    },
  { name: 'GraduationCap', component: GraduationCap, label: 'School'     },
  { name: 'Briefcase',     component: Briefcase,     label: 'Work'       },
  { name: 'Leaf',          component: Leaf,          label: 'Nature'     },
  { name: 'Music',         component: Music,         label: 'Music'      },
  { name: 'BookOpen',      component: BookOpen,      label: 'Reading'    },
  { name: 'Heart',         component: Heart,         label: 'Health'     },
  { name: 'Sun',           component: Sun,           label: 'Morning'    },
  { name: 'Moon',          component: Moon,          label: 'Sleep'      },
  { name: 'Bed',           component: Bed,           label: 'Rest'       },
  { name: 'Apple',         component: Apple,         label: 'Diet'       },
  { name: 'Droplets',      component: Droplets,      label: 'Water'      },
  { name: 'Bike',          component: Bike,          label: 'Cycling'    },
  { name: 'Mountain',      component: Mountain,      label: 'Hiking'     },
  { name: 'Code2',         component: Code2,         label: 'Coding'     },
  { name: 'Coffee',        component: Coffee,        label: 'Coffee'     },
  { name: 'Pencil',        component: Pencil,        label: 'Writing'    },
  { name: 'Target',        component: Target,        label: 'Focus'      },
  { name: 'Zap',           component: Zap,           label: 'Energy'     },
  { name: 'Timer',         component: Timer,         label: 'Time'       },
  { name: 'Trophy',        component: Trophy,        label: 'Win'        },
  { name: 'Flame',         component: Flame,         label: 'Intensity'  },
  { name: 'Globe',         component: Globe,         label: 'Language'   },
  { name: 'Headphones',    component: Headphones,    label: 'Podcast'    },
  { name: 'Palette',       component: Palette,       label: 'Art'        },
  { name: 'Shield',        component: Shield,        label: 'Discipline' },
  { name: 'Wallet',        component: Wallet,        label: 'Finance'    },
  { name: 'Pill',          component: Pill,          label: 'Medicine'   },
  { name: 'Camera',        component: Camera,        label: 'Photo'      },
  { name: 'Utensils',      component: Utensils,      label: 'Cooking'    },
  { name: 'Users',         component: Users,         label: 'Social'     },
  { name: 'Smile',         component: Smile,         label: 'Happiness'  },
  { name: 'Dog',           component: Dog,           label: 'Pet'        },
  { name: 'Baby',          component: Baby,          label: 'Family'     },
  { name: 'Plane',         component: Plane,         label: 'Travel'     },
  { name: 'ShoppingCart',  component: ShoppingCart,  label: 'Shopping'   },
  { name: 'Gamepad2',      component: Gamepad2,      label: 'Gaming'     },
]

export function getIcon(name: string): LucideIcon {
  return ICONS.find(i => i.name === name)?.component ?? Star
}
