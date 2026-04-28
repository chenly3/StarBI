package io.dataease.api.ai.query;

import com.github.xiaoymin.knife4j.annotations.ApiSupport;
import io.dataease.api.ai.query.request.AIQueryChartInsertRequest;
import io.dataease.api.ai.query.request.AIQueryChartMaterializeRequest;
import io.dataease.api.ai.query.vo.AIQueryChartInsertTargetVO;
import io.dataease.api.ai.query.vo.AIQueryChartResourceVO;
import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import io.dataease.api.ai.query.vo.AIQueryRecentResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "智能问数:图表资源")
@ApiSupport(order = 781)
@RequestMapping("/ai/query/chart-resources")
public interface AIQueryChartResourceApi {

    @Operation(summary = "校验问数图表是否可插入")
    @PostMapping("/validate")
    AIQueryChartValidationVO validateInsert(@RequestBody AIQueryChartMaterializeRequest request);

    @Operation(summary = "查询最近问数结果")
    @GetMapping("/recent-results")
    List<AIQueryRecentResultVO> listRecentResults();

    @Operation(summary = "查询已保存问数图表资源")
    @GetMapping("/saved")
    List<AIQueryChartResourceVO> listSavedResources();

    @Operation(summary = "查询插入目标画布")
    @Parameter(name = "canvasType", description = "画布类型", required = true, in = ParameterIn.QUERY)
    @GetMapping("/targets")
    List<AIQueryChartInsertTargetVO> listInsertTargets(@RequestParam String canvasType);

    @Operation(summary = "插入问数图表到目标画布")
    @PostMapping("/insert")
    Long insertIntoCanvas(@RequestBody AIQueryChartInsertRequest request);
}
