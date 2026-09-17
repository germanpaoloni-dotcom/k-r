export type PetMood = "idle" | "sleepy" | "happy" | "surprised";

export interface IllustrationProps {
  color: string;
  accent?: string;
  mood?: PetMood;
  size?: number;
  className?: string;
}

const STROKE = "#111111";

function Eyes({ mood, cx1, cx2, cy }: { mood: PetMood; cx1: number; cx2: number; cy: number }) {
  if (mood === "sleepy") {
    return (
      <>
        <path d={`M${cx1 - 5} ${cy} q5 4 10 0`} stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path d={`M${cx2 - 5} ${cy} q5 4 10 0`} stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (mood === "surprised") {
    return (
      <>
        <circle cx={cx1} cy={cy} r={4.2} fill={STROKE} />
        <circle cx={cx2} cy={cy} r={4.2} fill={STROKE} />
      </>
    );
  }
  return (
    <>
      <circle cx={cx1} cy={cy} r={3.2} fill={STROKE} />
      <circle cx={cx2} cy={cy} r={3.2} fill={STROKE} />
    </>
  );
}

export function DogIllustration({ color, accent, mood = "idle", size = 96, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <ellipse cx="28" cy="38" rx="13" ry="17" fill={color} stroke={STROKE} strokeWidth="2.2" transform="rotate(-18 28 38)" />
      <ellipse cx="72" cy="38" rx="13" ry="17" fill={color} stroke={STROKE} strokeWidth="2.2" transform="rotate(18 72 38)" />
      <circle cx="50" cy="52" r="34" fill={color} stroke={STROKE} strokeWidth="2.4" />
      <ellipse cx="50" cy="66" rx="16" ry="12" fill="#ffffff" fillOpacity="0.85" stroke={STROKE} strokeWidth="2" />
      <ellipse cx="50" cy="60" rx="4.2" ry="3.2" fill={STROKE} />
      <path d="M50 63 v4 M46 69 q4 3 8 0" stroke={STROKE} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Eyes mood={mood} cx1={38} cx2={62} cy={46} />
      {accent && <circle cx={50} cy={52} r={34} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.35" />}
    </svg>
  );
}

export function CatIllustration({ color, accent, mood = "idle", size = 96, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <path d="M22 34 L32 14 L40 36 Z" fill={color} stroke={STROKE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M78 34 L68 14 L60 36 Z" fill={color} stroke={STROKE} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="50" cy="52" r="32" fill={color} stroke={STROKE} strokeWidth="2.4" />
      <path d="M18 54 h-12 M18 60 h-13 M82 54 h12 M82 60 h13" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 62 l-4 5 h8 Z" fill={STROKE} />
      <path d="M50 67 q-5 4 -10 1 M50 67 q5 4 10 1" stroke={STROKE} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Eyes mood={mood} cx1={38} cx2={62} cy={46} />
      {accent && <circle cx={50} cy={52} r={32} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.35" />}
    </svg>
  );
}

export function DragonIllustration({ color, accent, mood = "idle", size = 96, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      {/* alas */}
      <path
        d="M14 58 Q0 48 6 32 Q22 36 28 54 Q22 58 14 58 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M86 58 Q100 48 94 32 Q78 36 72 54 Q78 58 86 58 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* cuernos */}
      <path d="M36 18 Q32 6 26 2 Q34 4 40 14 Z" fill={accent ?? color} stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M64 18 Q68 6 74 2 Q66 4 60 14 Z" fill={accent ?? color} stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round" />
      {/* cabeza — apunta a un hocico, no una cara redonda */}
      <path
        d="M50 10 C66 10 80 24 80 42 C80 58 68 70 59 78 L54 92 Q50 97 46 92 L41 78 C32 70 20 58 20 42 C20 24 34 10 50 10 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* cresta */}
      <path d="M44 12 L47 4 L50 12 M50 10 L53 3 L56 11 M56 12 L59 6 L62 14" fill={accent ?? color} stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round" />
      {/* fosas nasales */}
      <ellipse cx="45" cy="80" rx="2.2" ry="3" fill={STROKE} transform="rotate(-8 45 80)" />
      <ellipse cx="55" cy="80" rx="2.2" ry="3" fill={STROKE} transform="rotate(8 55 80)" />
      <Eyes mood={mood} cx1={38} cx2={62} cy={42} />
    </svg>
  );
}

export function RabbitIllustration({ color, accent, mood = "idle", size = 96, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <ellipse cx="34" cy="20" rx="9" ry="22" fill={color} stroke={STROKE} strokeWidth="2.2" />
      <ellipse cx="34" cy="22" rx="4" ry="16" fill={accent ?? "#ffffff"} fillOpacity="0.7" />
      <ellipse cx="66" cy="20" rx="9" ry="22" fill={color} stroke={STROKE} strokeWidth="2.2" />
      <ellipse cx="66" cy="22" rx="4" ry="16" fill={accent ?? "#ffffff"} fillOpacity="0.7" />
      <circle cx="50" cy="56" r="30" fill={color} stroke={STROKE} strokeWidth="2.4" />
      <ellipse cx="50" cy="66" rx="13" ry="9" fill="#ffffff" fillOpacity="0.85" stroke={STROKE} strokeWidth="2" />
      <path d="M50 60 v4" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
      <path d="M45 68 q5 3 10 0" stroke={STROKE} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Eyes mood={mood} cx1={40} cx2={60} cy={50} />
    </svg>
  );
}

export function BirdIllustration({ color, accent, mood = "idle", size = 96, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <path d="M14 54 Q2 50 8 36 Q22 40 28 54 Z" fill={accent ?? color} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M86 54 Q98 50 92 36 Q78 40 72 54 Z" fill={accent ?? color} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 12 L50 2 L54 14 Z" fill={accent ?? color} stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="50" cy="54" r="32" fill={color} stroke={STROKE} strokeWidth="2.4" />
      <path d="M42 62 L58 62 L50 72 Z" fill="#f5a623" stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round" />
      <Eyes mood={mood} cx1={40} cx2={60} cy={48} />
    </svg>
  );
}

export const ILLUSTRATION_BY_SPECIES: Record<
  string,
  (props: IllustrationProps) => ReturnType<typeof DogIllustration>
> = {
  dog: DogIllustration,
  cat: CatIllustration,
  dragon: DragonIllustration,
  rabbit: RabbitIllustration,
  bird: BirdIllustration,
};
