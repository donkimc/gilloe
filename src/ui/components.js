export function bindHoldToReveal(root) {
  const hold = root.querySelector(".hold");
  const card = root.querySelector("#private-card");
  if (!hold || !card) return () => {};

  const show = () => card.classList.remove("is-hidden");
  const hide = () => card.classList.add("is-hidden");

  hold.addEventListener("pointerdown", show);
  hold.addEventListener("pointerup", hide);
  hold.addEventListener("pointerleave", hide);
  hold.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      show();
    }
  });
  hold.addEventListener("keyup", hide);
  return hide;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
