module.exports = app => {
  return app
    .plugin("users")
    .addFetchHandler([], async item => {
      const fetchUsers = async () => {
        const data = await app.client.getAll("rest/api/1.0/admin/users");
        const users = data.values
          .sort((u1, u2) => u1.name > u2.name)
          .map(({ name, emailAddress, displayName, slug }) => {
            if (slug !== name) {
              // FIXME console.warn
              // eslint-disable-next-line no-console
              console.warn(
                `UserSlug should match UserName, "${slug}" !== "${name}"`
              );
            }
            return {
              [slug]: {
                displayName,
                email: emailAddress
              }
            };
          });
        return users;
      };

      const users = await fetchUsers();
      item.push({ users });
    })
    .addApplyHandler(["users", ":arg"], async (local, remote, [name]) => {
      const createUser = async data => {
        await app.client.post("rest/api/1.0/admin/users", {
          query: {
            addToDefaultGroup: false,
            notify: false,
            ...data
          }
        });
      };

      const updateUser = async (name, data) => {
        await app.client.put("rest/api/1.0/admin/users", {
          data: {
            name,
            ...data
          }
        });
      };

      const removeUser = async name => {
        await app.client.delete("rest/api/1.0/admin/users", {
          query: { name }
        });
      };

      if (remote === undefined) {
        const { email, password, displayName } = local;
        await createUser({
          name,
          emailAddress: email,
          displayName,
          password: await app._decrypt(password)
        });
      } else if (local === undefined) {
        await removeUser(name);
      } else {
        const { displayName, email } = local;
        if (email !== remote.email || displayName !== remote.displayName) {
          await updateUser(name, {
            displayName,
            email
          });
        }
      }
    });
};
