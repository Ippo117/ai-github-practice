const OPERATORS = ['+', '-', '×'];

function randomInt(max) {
  return Math.floor(Math.random() * max) + 1;
}

export function createProblem(level) {
  const difficulty = Math.max(0, level);
  const maxOperand = 5 + difficulty * 2;
  const operatorIndex = Math.min(OPERATORS.length - 1, Math.floor(difficulty / 3));
  const operator = OPERATORS[operatorIndex];

  const left = randomInt(maxOperand);
  const right = randomInt(maxOperand);

  if (operator === '+') {
    return {
      left,
      operator,
      right,
      answer: left + right,
      prompt: `${left} + ${right}`
    };
  }

  if (operator === '-') {
    const larger = Math.max(left, right);
    const smaller = Math.min(left, right);

    return {
      left: larger,
      operator,
      right: smaller,
      answer: larger - smaller,
      prompt: `${larger} - ${smaller}`
    };
  }

  return {
    left,
    operator,
    right,
    answer: left * right,
    prompt: `${left} × ${right}`
  };
}
