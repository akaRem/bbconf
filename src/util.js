const diffLists = (a, b) => {
  const onlyInA = a.filter(i => !b.includes(i));
  const onlyInB = b.filter(i => !a.includes(i));
  const both = a.filter(i => b.includes(i));
  return [onlyInA, both, onlyInB];
};

module.exports = {
  diffLists
};
