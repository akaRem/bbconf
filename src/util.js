const diffLists = (a, b) => {
  const onlyInA = a.filter(i => !b.includes(i));
  const onlyInB = b.filter(i => !a.includes(i));
  const both = a.filter(i => b.includes(i));
  return [onlyInA, both, onlyInB];
};

const diffIgnoreableObjects = (a, b) => {
  const toIgnore = Object.keys(a).filter(k => a[k] === "ignore");
  return diffLists(
    Object.keys(a).filter(k => !toIgnore.includes(k)),
    Object.keys(b).filter(k => !toIgnore.includes(k))
  );
};

module.exports = {
  diffLists,
  diffIgnoreableObjects
};
