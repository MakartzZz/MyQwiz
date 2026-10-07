import coffeeCup from "../assets/branding/support-coffee.webp";

export default function SupportCoffee({ className = "" }) {
  return (
    <span className={`support-coffee ${className}`.trim()} aria-hidden="true">
      <img src={coffeeCup} alt="" />
    </span>
  );
}
