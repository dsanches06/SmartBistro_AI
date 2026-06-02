function parsePositiveInt(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }
  const cleaned = String(value).trim().replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function textIncludesMenuName(text, menuName) {
  const normalizedText = String(text).toLowerCase();
  const normalizedMenuName = String(menuName)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!normalizedMenuName) return false;
  if (normalizedText.includes(normalizedMenuName)) return true;
  const tokens = normalizedMenuName.split(" ").filter(Boolean);
  return tokens.every((token) => token.length > 1 && normalizedText.includes(token));
}

function guessMenuItemByName(name, menuItems) {
  if (!name || !Array.isArray(menuItems)) return null;
  const n = String(name).trim().toLowerCase();
  let found = menuItems.find(
    (m) => String(m?.name ?? "").trim().toLowerCase() === n,
  );
  if (found) return found;
  found = menuItems.find((m) => {
    const itemName = String(m?.name ?? "").trim().toLowerCase();
    return itemName.includes(n) || n.includes(itemName);
  });
  if (found) return found;
  found = menuItems.find((m) => {
    const itemName = String(m?.name ?? "").trim().toLowerCase();
    return itemName.startsWith(n) || n.startsWith(itemName);
  });
  return found || null;
}

function guessItemsFromRawText(rawText, menuItems) {
  if (!rawText || !Array.isArray(menuItems)) return [];
  const found = [];
  for (const menuItem of menuItems) {
    if (!menuItem?.name) continue;
    if (textIncludesMenuName(rawText, menuItem.name)) {
      found.push(menuItem);
    }
  }
  return Array.from(new Set(found));
}

function repairMaitreItemObject(item, menuItems) {
  const name = item?.name ? String(item.name).trim() : "";
  const rawId = parsePositiveInt(item?.item_id ?? item?.id ?? item?.itemId);
  const guess = !rawId && name ? guessMenuItemByName(name, menuItems) : null;

  return {
    ...item,
    item_id: rawId || (guess ? Number(guess.id) : undefined),
    name: guess ? guess.name : name || item?.name,
    quantity: Number(item?.quantity ?? 1),
    price: guess ? Number(guess.price) : Number(item?.price ?? 0),
    price_corrected: item?.price_corrected != null
      ? Boolean(item.price_corrected)
      : false,
  };
}

function repairMaitreItems(items, menuItems) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => repairMaitreItemObject(item, menuItems));
}

function normalizeInvalidItemsArray(parsed) {
  if (!Array.isArray(parsed.invalid_items)) return parsed;
  const normalized = parsed.invalid_items
    .map((it) => {
      if (!it) return null;
      if (typeof it === "string") return { name: it };
      if (typeof it === "object") return it;
      return null;
    })
    .filter(Boolean);
  return { ...parsed, invalid_items: normalized };
}

function attemptRepairMaitreResponse(parsed, menuItems, rawText = "") {
  let repaired = normalizeInvalidItemsArray(parsed || {});

  if (Array.isArray(repaired.items) && repaired.items.length) {
    repaired.items = repairMaitreItems(repaired.items, menuItems);
  }

  if (
    (!Array.isArray(repaired.items) || repaired.items.length === 0) &&
    Array.isArray(repaired.invalid_items) &&
    repaired.invalid_items.length
  ) {
    const items = repaired.invalid_items.map((inv) => {
      const name = inv.name ?? String(inv).trim();
      const guess = guessMenuItemByName(name, menuItems);
      const rawId = parsePositiveInt(inv?.item_id ?? inv?.id ?? inv?.itemId);
      const itemId = rawId || (guess ? Number(guess.id) : undefined);
      return {
        item_id: itemId,
        name: guess ? guess.name : name,
        quantity: inv.quantity ? Number(inv.quantity) : 1,
        price: guess ? Number(guess.price) : Number(inv.price ?? 0),
        price_corrected: false,
      };
    });
    repaired.items = repairMaitreItems(items, menuItems);
    repaired.validation_status = "invalid";
  }

  if ((!Array.isArray(repaired.items) || repaired.items.length === 0) && rawText) {
    const guessedMenuItems = guessItemsFromRawText(rawText, menuItems);
    if (guessedMenuItems.length) {
      repaired.items = guessedMenuItems.map((menuItem) => ({
        item_id: Number(menuItem.id),
        name: menuItem.name,
        quantity: 1,
        price: Number(menuItem.price),
        price_corrected: false,
      }));
      repaired.validation_status = "invalid";
    }
  }

  return repaired;
}

function enforceMenuPrices(validated, menuItems) {
  const menuById = new Map(menuItems.map((item) => [Number(item.id), item]));
  const invalidItems = [];
  const items = validated.items.map((item) => {
    const menuItem = menuById.get(Number(item.item_id));
    if (!menuItem) {
      invalidItems.push({
        item_id: item.item_id,
        name: item.name ?? null,
        reason: "not_in_active_menu",
      });
      return item;
    }
    const exactPrice = Number(menuItem.price);
    return {
      ...item,
      name: menuItem.name,
      price: exactPrice,
      price_corrected: Number(item.price) !== exactPrice,
    };
  });

  const result = { ...validated, items };
  if (invalidItems.length) {
    result.invalid_items = invalidItems;
    result.validation_status = "invalid";
  }
  return result;
}

export {
  attemptRepairMaitreResponse,
  enforceMenuPrices,
};