-- Оновити всі продажі без cellNumber
UPDATE sales s
SET "cellNumber" = c.number
FROM cells c
WHERE s."cellNumber" IS NULL
  AND s."ortomatId" = c."ortomatId"
  AND s."productId" = c."productId"
  AND c."isAvailable" = false;  -- Комірка яка була використана

-- Показати результат
SELECT 
  s.id, 
  s."cellNumber", 
  s."ortomatId",
  p."orderId"
FROM sales s
JOIN payments p ON s."paymentId" = p.id
ORDER BY s."createdAt" DESC
LIMIT 10;