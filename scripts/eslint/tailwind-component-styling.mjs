const composers = new Set(["cn", "clsx", "classNames"]);

function called(node, names, sourceCode) {
  if (node?.type !== "CallExpression" || node.callee.type !== "Identifier")
    return false;
  if (names.has(node.callee.name)) return true;
  const definition = binding(node.callee, sourceCode)?.defs.find(
    (entry) => entry.type === "ImportBinding"
  );
  return names.has(definition?.node.imported?.name);
}

function binding(node, sourceCode) {
  for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name);
    if (variable) return variable;
  }
}

function initializer(node, sourceCode) {
  return binding(node, sourceCode)?.defs.find(
    (definition) => definition.type === "Variable"
  )?.node.init;
}

function importSource(node, sourceCode) {
  return binding(node, sourceCode)?.defs.find(
    (entry) => entry.type === "ImportBinding"
  )?.parent?.source.value;
}

function generatedClassMember(node, sourceCode) {
  if (node.object.type !== "Identifier") return false;
  const source = importSource(node.object, sourceCode);
  if (typeof source !== "string") return false;
  if (/\.module\.(css|scss|sass)$/.test(source)) return true;
  return (
    source === "@/fonts" &&
    !node.computed &&
    ["variable", "className"].includes(node.property.name)
  );
}

function memberValue(node, sourceCode) {
  let object =
    node.object.type === "Identifier"
      ? initializer(node.object, sourceCode)
      : node.object;
  const seen = new Set();
  while (object?.type === "Identifier" && !seen.has(object)) {
    seen.add(object);
    object = initializer(object, sourceCode);
  }
  const property = node.computed ? node.property.value : node.property.name;
  if (object?.type === "ObjectExpression" && property !== undefined) {
    const entry = object.properties.find(
      (value) =>
        value.type === "Property" &&
        (value.key.name ?? value.key.value) === property
    );
    return entry?.value;
  }
}

// Resolve local values and imported class values, but not forwarded props or
// function results from third-party class APIs such as getDefaultClassNames.
function storesClasses(node, sourceCode, seen = new Set()) {
  if (!node || seen.has(node)) return false;
  seen.add(node);
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string";
    case "TemplateLiteral":
      return true;
    case "Identifier":
      return (
        Boolean(importSource(node, sourceCode)) ||
        storesClasses(initializer(node, sourceCode), sourceCode, seen)
      );
    case "ArrayExpression":
      return node.elements.some((element) =>
        storesClasses(element, sourceCode, seen)
      );
    case "ObjectExpression":
      return node.properties.some((property) =>
        storesClasses(property.value ?? property.argument, sourceCode, seen)
      );
    case "ConditionalExpression":
      return (
        storesClasses(node.consequent, sourceCode, seen) ||
        storesClasses(node.alternate, sourceCode, seen)
      );
    case "LogicalExpression":
      return (
        storesClasses(node.left, sourceCode, seen) ||
        storesClasses(node.right, sourceCode, seen)
      );
    case "BinaryExpression":
      return (
        node.operator === "+" &&
        (storesClasses(node.left, sourceCode, seen) ||
          storesClasses(node.right, sourceCode, seen))
      );
    case "CallExpression":
      return (
        called(node, composers, sourceCode) ||
        (node.callee.type === "MemberExpression" &&
          node.callee.property.name === "join" &&
          storesClasses(node.callee.object, sourceCode, seen))
      );
    case "MemberExpression": {
      if (generatedClassMember(node, sourceCode)) return false;
      const value = memberValue(node, sourceCode);
      return storesClasses(value ?? node.object, sourceCode, seen);
    }
    case "SpreadElement":
      return storesClasses(node.argument, sourceCode, seen);
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "ChainExpression":
      return storesClasses(node.expression, sourceCode, seen);
    default:
      return false;
  }
}

/** @type {import("eslint").Rule.RuleModule} */
const tailwindComponentStyling = {
  meta: {
    type: "problem",
    schema: [],
    docs: {
      description:
        "Keep Tailwind utility composition inline and reuse components, not class strings."
    },
    messages: {
      interpolation:
        "Do not interpolate className strings. Compose complete literal utility classes with cn instead.",
      storedClasses:
        "Do not store or reuse className strings in variables. Extract a reusable component; use inline cn for composition or cva for necessary variants."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const reported = new Set();
    function report(node, messageId) {
      if (reported.has(node)) return;
      reported.add(node);
      context.report({ node, messageId });
    }
    function check(node) {
      if (!node) return;
      switch (node.type) {
        case "TemplateLiteral":
          if (node.expressions.length) report(node, "interpolation");
          break;
        case "BinaryExpression":
          if (node.operator === "+") report(node, "interpolation");
          break;
        case "Identifier":
        case "MemberExpression":
          if (storesClasses(node, sourceCode)) report(node, "storedClasses");
          break;
        case "CallExpression":
          if (called(node, composers, sourceCode))
            node.arguments.forEach(check);
          break;
        case "ObjectExpression":
          node.properties.forEach((property) => {
            if (property.type === "SpreadElement") check(property.argument);
            else if (property.computed) check(property.key);
          });
          break;
        case "ConditionalExpression":
          check(node.consequent);
          check(node.alternate);
          break;
        case "LogicalExpression":
          // Left is usually a boolean condition; inspect it only if it is
          // itself a locally stored class value used by an || fallback.
          if (node.operator !== "&&") check(node.left);
          check(node.right);
          break;
        case "ArrayExpression":
          node.elements.forEach(check);
          break;
        case "SpreadElement":
          check(node.argument);
          break;
        case "TSAsExpression":
        case "TSSatisfiesExpression":
        case "TSNonNullExpression":
        case "ChainExpression":
          check(node.expression);
          break;
      }
    }
    function checkVariantValues(node) {
      if (node?.type === "ObjectExpression") {
        node.properties.forEach((property) =>
          checkVariantValues(property.value ?? property.argument)
        );
      } else check(node);
    }
    return {
      JSXAttribute(attribute) {
        if (
          attribute.name.type !== "JSXIdentifier" ||
          attribute.name.name !== "className" ||
          attribute.value?.type !== "JSXExpressionContainer"
        )
          return;
        check(attribute.value.expression);
      },
      CallExpression(node) {
        if (called(node, new Set(["cva"]), sourceCode)) {
          check(node.arguments[0]);
          const configuration = node.arguments[1];
          if (configuration?.type === "ObjectExpression") {
            const variants = configuration.properties.find(
              (property) =>
                (property.key?.name ?? property.key?.value) === "variants"
            );
            checkVariantValues(variants?.value);
          } else check(configuration);
        }
      }
    };
  }
};

export default tailwindComponentStyling;
