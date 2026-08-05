<?php
namespace Nesh;
class Collection implements \IteratorAggregate, \Countable, \ArrayAccess
{
    private array $items = [];
    public function add(mixed $item): static
    {
        $this->items[] = $item;
        return $this;
    }
    public function remove(mixed $item): static
    {
        $this->items = array_values(
            array_filter(
                $this->items,
                fn (mixed $current) => $current !== $item
            )
        );
        return $this;
    }
    public function clear(): static
    {
        $this->items = [];
        return $this;
    }
    public function all(): array
    {
        return $this->items;
    }
    public function first(): mixed
    {
        return $this->items[0] ?? null;
    }
    public function last(): mixed
    {
        return $this->items === []
            ? null
            : $this->items[array_key_last($this->items)];
    }
    public function get(int|string $offset): mixed
    {
        return $this->items[$offset] ?? null;
    }
    public function has(int|string $offset): bool
    {
        return isset($this->items[$offset]);
    }
    public function count(): int
    {
        return count($this->items);
    }
    public function isEmpty(): bool
    {
        return $this->count() === 0;
    }
    public function getIterator(): \Traversable
    {
        return new \ArrayIterator($this->items);
    }
    public function offsetExists(mixed $offset): bool
    {
        return isset($this->items[$offset]);
    }
    public function offsetGet(mixed $offset): mixed
    {
        return $this->items[$offset] ?? null;
    }
    public function offsetSet(mixed $offset, mixed $value): void
    {
        if ($offset === null) {
            $this->items[] = $value;
            return;
        }
        $this->items[$offset] = $value;
    }
    public function offsetUnset(mixed $offset): void
    {
        unset($this->items[$offset]);
    }
}