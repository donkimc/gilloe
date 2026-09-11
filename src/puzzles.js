export function checkMatchPuzzle(assignment, solution) {
  const missing = Object.keys(solution).filter((key) => !assignment?.[key]);
  if (missing.length) {
    return { correct: false, complete: false, wrongKeys: missing };
  }
  const wrongKeys = Object.keys(solution).filter((key) => assignment[key] !== solution[key]);
  return { correct: wrongKeys.length === 0, complete: true, wrongKeys };
}

export function checkChoice(answer, solution) {
  return { correct: answer === solution };
}

export function checkOrder(ids, solution) {
  if (!Array.isArray(ids) || ids.length !== solution.length) {
    return { correct: false, complete: false };
  }
  const correct = ids.every((id, index) => id === solution[index]);
  return { correct, complete: true };
}

export function checkAccusation(answers, solution) {
  const murderer = answers?.murderer === solution.murderer;
  const motive = answers?.motive === solution.motive;
  const evidence = answers?.evidence === solution.evidence;
  return {
    murderer,
    motive,
    evidence,
    allCorrect: murderer && motive && evidence,
  };
}

export function moveItem(list, index, direction) {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
