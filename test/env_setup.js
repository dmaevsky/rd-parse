expect.addSnapshotSerializer({
  test(object) {
    return true;
  },
  print(val) {
    return JSON.stringify(val, null, 2);
  },
});
