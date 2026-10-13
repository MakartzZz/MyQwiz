import {
  Atom,
  BookOpen,
  Brain,
  Cat,
  FlaskConical,
  Gamepad2,
  Globe2,
  Headphones,
  Lightbulb,
  Microscope,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

const AVATAR_ICONS = [
  Cat,
  BookOpen,
  Brain,
  FlaskConical,
  Gamepad2,
  Globe2,
  Headphones,
  Lightbulb,
  Microscope,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Atom,
];

export const PROFILE_AVATARS = AVATAR_ICONS.map((Icon, index) => ({
  id: index + 1,
  Icon,
}));

export function ProfileAvatar({ avatarId = 1, size = 40, className = "" }) {
  const avatar = PROFILE_AVATARS[avatarId - 1] ?? PROFILE_AVATARS[0];
  const { Icon } = avatar;

  return (
    <span
      className={`profile-avatar profile-avatar--${avatar.id} ${className}`.trim()}
      style={{ "--profile-avatar-size": `${size}px` }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.15} />
    </span>
  );
}
