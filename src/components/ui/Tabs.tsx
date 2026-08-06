import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";
import { divider, transitionColors } from "../../styles";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        divider,
        "flex gap-1 overflow-x-auto",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        transitionColors,
        "-mb-px shrink-0 border-b-2 border-transparent px-4.5 py-3.5 text-small font-bold tracking-[0.02em] whitespace-nowrap text-fg-subtle hover:text-verde data-[state=active]:border-telha data-[state=active]:text-telha",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-6", className)} {...props} />;
}
