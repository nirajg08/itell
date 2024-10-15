import { analyzeClassQuizAction } from "@/actions/quiz";
import { CreateErrorFallback } from "@/components/error-fallback";
import { quizPages } from "@/lib/pages/pages.server";
import { Skeleton } from "@itell/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@itell/ui/table";
import { CircleIcon } from "lucide-react";

type Props = {
  students: { name: string; id: string }[];
};

export async function ClassQuizTable({ students }: Props) {
  const [data, err] = await analyzeClassQuizAction({
    ids: students.map((s) => s.id),
  });
  if (err) {
    throw new Error("failed to get class quiz stats", { cause: err });
  }

  const byStudent = data.reduce(
    (acc, cur) => {
      if (!acc[cur.name]) {
        acc[cur.name] = {};
      }

      if (!acc[cur.name][cur.pageSlug]) {
        acc[cur.name][cur.pageSlug] = cur.count;
      }

      return acc;
    },
    {} as Record<string, Record<string, number>>
  );
  return (
    <Table>
      <TableHeader>
        <TableHead className="w-40" />
        <TableHead className="w-20">Total</TableHead>
        {quizPages.map((page) => (
          <TableHead key={page.slug}>{page.title}</TableHead>
        ))}
      </TableHeader>
      <TableBody>
        {Object.entries(byStudent).map(([name, records]) => (
          <TableRow key={name}>
            <TableCell className="font-semibold">{name}</TableCell>
            <TableCell className="font-semibold">
              {Object.keys(records).length}
            </TableCell>
            {quizPages.map((page) => (
              <TableCell key={page.slug}>
                {records[page.slug] ? (
                  <span>
                    {records[page.slug]} / {page.quiz?.length}
                  </span>
                ) : (
                  <CircleIcon className="text-muted-foreground" />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

ClassQuizTable.Skeleton = function () {
  return <Skeleton className="h-80 w-full" />;
};

ClassQuizTable.ErrorFallback = CreateErrorFallback(
  "Failed to get quiz statistics"
);