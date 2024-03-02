const dataMap = {
    app1: {
      svc1: {
        get: () => "Data for app1, svc1",
      },
      svc2: {
        get: () => "Data for app1, svc2",
      },
    },
    app2: {
      svc1: {
        get: () => "Data for app2, svc1",
      },
    },
  };


  const handler = {
    get: function(target, prop, receiver) {
      // If the prop exists in the target, return it
      if (prop in target) {
        return target[prop];
      }
      // If the prop doesn't exist, return a new Proxy
      // This allows for chaining like routing.app.svc.get()
      const nextTarget = target[prop] || new Proxy({}, handler);
      target[prop] = nextTarget; // Cache the created Proxy for future accesses
      // If accessing the 'get' method, perform the lookup
      if (prop === 'get') {
        return () => {
          // Convert the path array to a string like 'app1.svc1'
          const path = target.path.join('.');
          // Perform the data lookup
          const result = path.split('.').reduce((acc, key) => acc && acc[key], dataMap);
          return result ? result.get() : undefined; // Execute get() if the path is valid
        };
      }
      // For any other property, update the path and return the Proxy for further chaining
      nextTarget.path = (target.path || []).concat(prop);
      return nextTarget;
    }
  };


  const routing = new Proxy({}, handler);
  console.log(routing.app1.svc1.get()); // Outputs: Data for app1, svc1
  console.log(routing.app1.svc2.get()); // Outputs: Data for app1, svc2
  console.log(routing.app2.svc1.get()); // Outputs: Data for app2, svc1
  console.log(routing.app3.svc1.get()); // Outputs: undefined, sin