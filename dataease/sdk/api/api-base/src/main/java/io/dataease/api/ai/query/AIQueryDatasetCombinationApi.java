package io.dataease.api.ai.query;

import com.github.xiaoymin.knife4j.annotations.ApiSupport;
import io.dataease.api.ai.query.request.AIQueryDatasetCombinationCreateRequest;
import io.dataease.api.ai.query.vo.AIQueryDatasetCombinationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Tag(name = "智能问数:数据集组合")
@ApiSupport(order = 781)
@RequestMapping("/ai/query")
public interface AIQueryDatasetCombinationApi {

    @Operation(summary = "创建问数组合数据集")
    @PostMapping("/dataset-combination")
    AIQueryDatasetCombinationVO createCombination(@RequestBody AIQueryDatasetCombinationCreateRequest request);
}
