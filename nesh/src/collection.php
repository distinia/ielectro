<?php
namespace Nesh;
class Collection
{
    private array $items = [];
    public function add(mixed $item): static
    {
        $this->items[] = $item;
        return $this;
    }
    public function remove(mixed $item): static
    {
        $this->items = array_filter(
            $this->items,
            fn ($current) => $current !== $item
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
        return reset($this->items);
    }
    public function last(): mixed
    {
        return end($this->items);
    }
    public function count(): int
    {
        return count($this->items);
    }
}